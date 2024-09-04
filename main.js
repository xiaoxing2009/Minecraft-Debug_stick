/*
版权所有 (c) 2024 xiaoxing2009
此代码依据 MIT 许可证获得许可。有关详细信息，请参见项目根目录中的 LICENSE 文件。
项目地址：https://github.com/xiaoxing2009/Minecraft-Debug_stick
*/
import { BlockStates, world, system } from "@minecraft/server";

const xmplayerrecord = {};

function xmshowmessage(xmmessage, xmplayer) {
    return xmplayer.runCommandAsync(`titleraw @s actionbar {"rawtext":[{"text":${JSON.stringify(xmmessage)}}]}`);
}

function xmdisplayblockdetails(xmplayer, xmblock) {
    let xminfo = "§7方块标识符§8: §l§b" + xmblock.typeId + "§r";
    xminfo += "\n§7方块坐标§8: §4" + xmblock.x + " §a" + xmblock.y + " §9" + xmblock.z;
    xminfo += "\n§7物质状态§8: §e";
    if (xmblock.isLiquid) xminfo += "液体";
    else if (xmblock.isAir) xminfo += "气体";
    else xminfo += "固体";
    xminfo += "\n§7坚硬方块§8: " + (xmblock.isSolid ? "§a是" : "§c否");
    xminfo += "\n§7红石信号强度§8: §c" + (xmblock.getRedstonePower() ?? 0);
    Object.entries(xmblock.permutation.getAllStates()).forEach(([xmkey, xmval]) => {
        xminfo += "\n§o§7" + xmkey + "§r§8: ";
        if (typeof xmval == "string") xminfo += "§e";
        if (typeof xmval == "number") xminfo += "§3";
        if (typeof xmval == "boolean") xminfo += "§6";
        xminfo += xmval;
    });
    if (xmblock.type.canBeWaterlogged) xminfo += "\n§o§7方块含水§r§8: §6" + xmblock.isWaterlogged;
    xmblock.getTags().forEach(xmtag => xminfo += "\n§d#" + xmtag);
    xmshowmessage(xminfo, xmplayer);
}

function xmmodifyblockproperty(xmplayer, xmblock) {
    const xmpermutation = xmblock.permutation;
    const xmstates = xmpermutation.getAllStates();
    const xmstatenames = Object.keys(xmstates);
    if (!xmstatenames.length && !xmblock.type.canBeWaterlogged) return xmshowmessage(`${xmblock.typeId} 没有属性`, xmplayer);
    let xmproperty = xmplayerrecord[xmplayer.id];
    let xmvalue;
    if (xmproperty == "waterlogged" ? !xmblock.type.canBeWaterlogged : !xmstatenames.includes(xmproperty)) xmproperty = xmstatenames[0];
    if (!xmproperty && xmblock.type.canBeWaterlogged) xmproperty = "waterlogged";
    if (xmproperty == "waterlogged") {
        xmvalue = !xmblock.isWaterlogged;
        system.run(() => {
            xmblock.setWaterlogged(xmvalue);
        });
    } else {
        const xmvalidvalues = BlockStates.get(xmproperty).validValues;
        xmvalue = xmvalidvalues[xmvalidvalues.indexOf(xmstates[xmproperty]) + 1];
        if (typeof xmvalue === "undefined") xmvalue = xmvalidvalues[0];
        system.run(() => {
            xmblock.setPermutation(xmpermutation.withState(xmproperty, xmvalue));
        });
    }
    xmplayerrecord[xmplayer.id] = xmproperty;
    xmshowmessage(`将"${xmproperty}"设为${xmvalue}`, xmplayer);
}

function xmchangeblockproperty(xmplayer, xmblock) {
    const xmpermutation = xmblock.permutation;
    const xmstates = xmpermutation.getAllStates();
    const xmstatenames = Object.keys(xmstates);
    if (!xmstatenames.length && !xmblock.type.canBeWaterlogged) return xmshowmessage(`${xmblock.typeId} 没有属性`, xmplayer);
    let xmproperty = xmstatenames[xmstatenames.indexOf(xmplayerrecord[xmplayer.id]) + 1];
    let xmvalue = xmstates[xmproperty];
    if (!xmproperty) {
        if (xmblock.type.canBeWaterlogged) {
            xmproperty = "waterlogged";
            xmvalue = xmblock.isWaterlogged;
        } else {
            xmproperty = xmstatenames[0];
            xmvalue = xmstates[xmproperty];
        }
    }
    xmplayerrecord[xmplayer.id] = xmproperty;
    xmshowmessage(`已选择 “${xmproperty}” (${xmvalue})`, xmplayer);
}

world.afterEvents.entityHitBlock.subscribe(xmevent => {
    if (xmevent.damagingEntity.typeId != "minecraft:player") return;
    const xmplayer = world.getAllPlayers().find(p => p.id == xmevent.damagingEntity.id);
    if (xmplayer.getComponent("minecraft:inventory").container.getItem(xmplayer.selectedSlotIndex)?.typeId != "xm:debug_stick") return;
    xmchangeblockproperty(xmplayer, xmevent.hitBlock);
});

world.beforeEvents.itemUseOn.subscribe(xmevent => {
    if (xmevent.source.typeId != "minecraft:player" || xmevent.itemStack?.typeId != "xm:debug_stick") return;
    xmevent.cancel = true;
    const xmplayer = world.getAllPlayers().find(p => p.id == xmevent.source.id);
    if (xmplayer.isSneaking) xmdisplayblockdetails(xmplayer, xmevent.block);
    else xmmodifyblockproperty(xmplayer, xmevent.block);
});
