const db = require('./models');
const playerToken = require('./tokens/playerTokens.js');
const chatToken = require('./tokens/chatToken.js');
const Account = db.playerAccounts.Account;
const AccountPunishment = db.playerAccounts.AccountPunishment;
const Booster = db.boosters.Booster;
const AccountRank = db.playerAccounts.AccountRank;
const CustomBuild = db.playerAccounts.CustomBuild;
const CustomBuildSlot = db.playerAccounts.CustomBuildSlot;
const AccountPurchase = db.playerAccounts.AccountPurchase;
const ShadowMute = db.chat.ShadowMute;
const filteredWords = require('./config/filteredWords.json');
const fs = require('fs')
const npcs = require('./misc_models/npcs.js');
const newnpcsnew = require('./misc_models/newnpcsnew.js');
const hubnews = require('./misc_models/hubnews.js');
const fetch = require('node-fetch');
const stats = require('./misc_models/stats.js');
const items = require('./misc_models/items.js');


const getNameById = async id => {
    return await Account.findAll({
        attributes: ['name'],
        where: { id }
    });
}

const getIdByName = async name => {
    const id = await Account.findAll({
        attributes: ['id'],
        where: { name }
    });
    if (id.length === 0) return []
    return id[0].id;
}

const getAccountByName = async name => {
    return await Account.findAll({
        where: { name }
    });
}

const getAccountByUuid = async uuid => {
    return await Account.findAll(
        { where: { uuid } }
    );
}

const updateOldUsername = async (newName, uuid) => {
    await Account.update(
        { name: newName },
        { where: { uuid } }
    );
}

const returnAllPunishments = async (id) => {
    const punishments = await AccountPunishment.findAll({
            where: { accountId: id }
        }
    );
    if (punishments.length === 0) return [];
    const accountPunishments = punishments.map((punishment) => {
        let time = Math.floor(punishment.time.getTime()) - Date.now();
        let removed = punishment.Removed === 1;
        let factor = Math.floor(punishment.duration/24);
        if (factor == 0) factor = punishment.duration/24
        let isActive = (
            punishment.duration < 0
            || Date.now() < punishment.time.getTime()
            + 86400000 * factor
        );
        if (removed) isActive = false;
        return {
            PunishmentId: punishment.id,
            Admin: punishment.admin,
            Time: time,
            Sentence: punishment.sentence,
            Category: punishment.category,
            Reason: punishment.reason,
            Removed: removed,
            RemoveReason: punishment.RemovedReason,
            RemoveAdmin: punishment.RemovedAdmin,
            Duration: punishment.duration,
            Active: isActive,
            Severity: punishment.severity
        };
    });
    return accountPunishments;
}

const userBuildExists = async (id, Name, PvpClass) => {
    const builds = await CustomBuild.findAll({
            where: {
                accountId: id,
                Name,
                PvpClass
            }
        }
    );
    return builds.length > 0;
}

const updateBuild = async (id, Name, PvpClass, additionalParams) => {
    return await CustomBuild.update(
        { ...additionalParams },
        {
            where: {
                accountId: id,
                Name,
                PvpClass
            }
        }
    );
}

const createBuild = async (accountId, createParams) => {
    return await CustomBuild.create(
        { accountId, ...createParams }
    );
}

const duplicateSlotExists = async (id, BuildName, PvpClass, slot) => {
    const result = await CustomBuildSlot.findAll({
        where: {
            accountId: id,
            BuildName,
            PvpClass,
            Name: slot.Name,
            Material: slot.Material,
            Amount: slot.Amount,
            SlotId: slot.SlotId
        }
    });
    return result.length > 0;
}

const slotOccupied = async (id, BuildName, PvpClass, slot) => {
    const result = await CustomBuildSlot.findAll({
        where: {
            accountId: id,
            BuildName,
            PvpClass,
            SlotId: slot.SlotId
        }
    });
    return result.length > 0;
}

const updateExistingSlot = async (id, BuildName, PvpClass, slot) => {
    return await CustomBuildSlot.update({
        Name: slot.Name,
        Material: slot.Material,
        Amount: slot.Amount
    }, {
        where: {
            accountId: id,
            BuildName,
            PvpClass,
            SlotId: slot.SlotId
        }
    });
}

const createSlot = async (id, BuildName, PvpClass, slot) => {
    return await CustomBuildSlot.create({
        accountId: id,
        BuildName,
        PvpClass,
        SlotId: slot.SlotId,
        Name: slot.Name,
        Material: slot.Material,
        Amount: slot.Amount
    });
}

const updateSlots = async (id, BuildName, PvpClass, slots) => {
    await Promise.all(slots.map(async (slot, i) => {
        slot.SlotId = i + 1;
        try {
            if (!slot.Name && !slot.Material) {
                slot.Name = ''
                slot.Material = ''
            }
            if (await duplicateSlotExists(id, BuildName, PvpClass, slot)) return;
            if (await slotOccupied(id, BuildName, PvpClass, slot)) {
                await updateExistingSlot(id, BuildName, PvpClass, slot);
            } else {
                await createSlot(id, BuildName, PvpClass, slot);
            }
        } catch (err) {
            console.error(err)
        }
    }));
}

const returnAllCustomBuilds = async id => {
    const builds = await CustomBuild.findAll({
        where: { accountId: id }
    });
    if (builds.length === 0) return [];
    const tokens = Promise.all(builds.map(async build => {
        let token = new playerToken.ClientClassToken();
        const name = await getNameById(id);
        token.CustomBuildId = 0;
        token.PlayerName = name[0].name;
        token.Name = build.Name;
        const isActive = build.Active === 1;
        token.Active = isActive;
        token.CustomBuildNumber = build.CustomBuildNumber;
        token.PvpClass = build.PvpClass;
        token.SwordSkill = build.SwordSkill;
        token.SwordSkillLevel = build.SwordSkillLevel;
        token.AxeSkill = build.AxeSkill;
        token.AxeSkillLevel = build.AxeSkillLevel;
        token.BowSkill = build.BowSkill;
        token.BowSkillLevel = build.BowSkillLevel;
        token.ClassPassiveASkill = build.ClassPassiveASkill;
        token.ClassPassiveASkillLevel = build.ClassPassiveASkillLevel;
        token.ClassPassiveBSkill = build.ClassPassiveBSkill;
        token.ClassPassiveBSkillLevel = build.ClassPassiveBSkillLevel;
        token.GlobalPassiveSkill = build.GlobalPassiveSkill;
        token.GlobalPassiveSkillLevel = build.GlobalPassiveSkillLevel;
        token.Slots = (await CustomBuildSlot.findAll({
            where: {
                accountId: id,
                BuildName: build.Name,
                PvpClass: build.PvpClass
            },
            order: [['SlotId', 'ASC']]
        })).map(slot => ({
            Name: slot.Name,
            Material: slot.Material,
            Amount: slot.Amount
        }));
        token.SkillTokens = build.SkillTokens;
        token.ItemTokens = build.ItemTokens;
        return token;
    }));
    return tokens;
};

const returnRank = async id => {
    let account = await AccountRank.findAll({ 
        where: { accountId: id, primaryGroup: 1}
    });
    if (account.length === 0) return 'PLAYER';
    return account[0].rankIdentifier;
}

const updateGems = async (name, gems) => {
    return await Account.update(
        { gems },
        { where: { name } }
    );
}

const updateCoins = async (name, coins) => {
    return await Account.update(
        { coins },
        { where: { name } }
    );
}

const doPunish = async params => {
    await AccountPunishment.create({ ...params })
}

const doRemovePunishment = async (accountId, RemovedReason, RemovedAdmin) => {
    await AccountPunishment.update({
            Removed: 1,
            RemovedReason,
            RemovedAdmin
        },
        { where: { accountId } }
    );
}


const doPurchaseUnknownSalesPackage = async (name, coins, coinPurchase) => {
    if (coinPurchase) return await updateCoins(name, coins);
    return await updateGems(name, coins);
}


const boostIsActive = startTime => {
    let date = new Date().getTime();
    return date < startTime + 3600000;
}

const addBoosterToDb = async params => {
    return await Booster.create({ ...params });
}

const filterActiveBoosters = async boosters => {
    let boosterList = {}
    boosters.forEach((booster) => {
        if (!boostIsActive(booster.startTime)) return;
        const startTime = new Date(booster.startTime).toISOString();
        const endTime = new Date(booster.startTime + 3600000).toISOString();
        if (!boosterList[booster.boosterGroup]) {
            boosterList[booster.boosterGroup] = [];
        }
        boosterList[booster.boosterGroup].push({
            id: booster.id,
            playerName: booster.activatorName,
            uuid: booster.activatorUUID,
            accountId: booster.accountId,
            duration: booster.duration,
            multiplier: 2.0,
            startTime,
            endTime,
            activationTime: startTime,
        });
    });
    return boosterList
}

const returnAllBoosters = async () => {
    const boosters = await Booster.findAll();
    if (boosters.length === 0) return {};
    return filterActiveBoosters(boosters);
}

const returnBoostersInGroup = async boosterGroup => {
    const boosters = await Booster.findAll({ where: { boosterGroup } });
    if (boosters.length === 0) return {};
    return filterActiveBoosters(boosters);
}

const returnNewBoosterStartTime = async boosterGroup => {
    let startTime = new Date().getTime()
    const boosters = await Booster.findAll({
        where: { boosterGroup },
        order: [['startTime', 'DESC']],
      });
    if (boosters.length === 0 || !boostIsActive(boosters[0].startTime)) return startTime;
    startTime = boosters[0].startTime + 3600000;
    return startTime;
}


const isShadowMuted = async (accountId, server) => {
    const shadowMute = await ShadowMute.findAll({
        attributes: ['isShadowMuted'],
        where: {
            accountId,
            server
        }
    })
    return shadowMute.length > 0 ? shadowMute[0].isShadowMuted : null;
}



const dumpIfTablesEmpty = async (sequelize, DataTypes) => {
    let sql_string = fs.readFileSync('./dumps/account.sql', 'utf8').split(";\n");
    const npc = await npcs(sequelize, DataTypes).findAll({});
    const newNpcs = await newnpcsnew(sequelize, DataTypes).findAll({});
    const hubNews = await hubnews(sequelize, DataTypes).findAll({});
    const statsTable = await stats(sequelize, DataTypes).findAll({});
    const itemsTable = await items(sequelize, DataTypes).findAll({});
    if (npc.length + newNpcs.length + hubNews.length + statsTable.length + itemsTable.length === 0) {
        let promise = sequelize.query("set FOREIGN_KEY_CHECKS=0"
        ).then(() => {
            return sequelize.query("set UNIQUE_CHECKS=0");
        }).then(() => {
            return sequelize.query("set SQL_MODE='NO_AUTO_VALUE_ON_ZERO'");
        }).then(() => {
            return sequelize.query("set SQL_NOTES=0");
        });
        for (let query of sql_string) {
            query = query.trim();
            if (query.length !== 0 && !query.match(/\/\*/)) {
              promise = promise.then(() => {
                return sequelize.query(query, {raw: true});
                })
            }
          }
    }
}

const doFilterMessage = async message => {
    let censoredMessage = message;
    filteredWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        censoredMessage = censoredMessage.replace(regex, '*'.repeat(word.length));
    });
    return censoredMessage;
}

const filterMessages = async messages => {
    let token = new chatToken.ChatFilterResponseToken();
    for (const message of messages) {
        const filteredMessage = await doFilterMessage(message.content);
        token.content.parts.push({ replacement: filteredMessage });
    }
    return token;
}

const getModifiedSkills = async skills => {
    const modifiedSkills = skills.map((skill, i) => {
        let modifiedSkill = { ...skill };
        modifiedSkill.SkillId = i+1;
        modifiedSkill.SalesPackage = {
            GameSalesPackageId: modifiedSkill.SkillId,
            Gems: skill.SalesPackage.Gems,
            Economy: 0,
            Free: skill.SalesPackage.Free
        };
        return modifiedSkill;
    });
    return modifiedSkills;
}

const validUuid = async uuid => {
    if (!uuid) return null;
    const url = `https://api.mojang.com/user/profile/${uuid}/`;
    const response = await fetch(url);
    const data = await response.json();
    return (!data.errorMessage);
}

const getNameByUuid = async uuid => {
    const url = `https://api.mojang.com/user/profile/${uuid}/`;
    const response = await fetch(url);
    const data = await response.json();
    return data.name;
}


const updateAccountPurchases = async (name, createParams) => {
    const accountId = await getIdByName(name);
    createParams.accountId = accountId;
    await AccountPurchase.create(
        { ...createParams }
    );
}

const ownsSalesPackage = async (name, checkParams) => {
    const accountId = await getIdByName(name);
    const result = await AccountPurchase.findAll({
        where: { accountId, ...checkParams } 
    });
    return result.length !== 0;
}

const retrieveSalesPackages = async id => {
    const packages = await AccountPurchase.findAll({ where: { accountId: id, packageName: '' } });
    return packages.map((package) => { return package.packageId });
}

const retrieveUnknownSalesPackages = async id => {
    const packages = await AccountPurchase.findAll({ where: { accountId: id, packageId: null} });
    return packages.map((package) => { return package.packageName });
}


module.exports = {
    getIdByName,
    getAccountByName,
    getAccountByUuid,
    updateOldUsername,
    returnAllPunishments,
    userBuildExists,
    updateBuild,
    createBuild,
    updateSlots,
    returnAllCustomBuilds,
    returnRank,
    updateGems,
    updateCoins,
    doPunish,
    doRemovePunishment,
    doPurchaseUnknownSalesPackage,
    addBoosterToDb,
    returnBoostersInGroup,
    returnAllBoosters,
    returnNewBoosterStartTime,
    isShadowMuted,
    filterMessages,
    getModifiedSkills,
    validUuid,
    getNameByUuid,
    dumpIfTablesEmpty,
    updateAccountPurchases,
    ownsSalesPackage,
    retrieveSalesPackages,
    retrieveUnknownSalesPackages
  };
