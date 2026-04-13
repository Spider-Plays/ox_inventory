--- Utility tray slot rules (must match web `utilitySlotsValidation.ts`).
local Items = require 'modules.items.server'

local M = {}

function M.getUtilitySlots()
	local utilityVest = GetConvarInt('inventory:utility_vest_slot', 0)
	local utilityPack = GetConvarInt('inventory:utility_backpack_slot', 0)
	local utilityPhone = GetConvarInt('inventory:utility_phone_slot', 0)
	local utilityCash = GetConvarInt('inventory:utility_cash_slot', 0)
	local custom = utilityVest > 0 and utilityPack > 0 and utilityPhone > 0 and utilityCash > 0

	return {
		vest = custom and utilityVest or (shared.playerslots - 3),
		backpack = custom and utilityPack or (shared.playerslots - 2),
		phone = custom and utilityPhone or (shared.playerslots - 1),
		cash = custom and utilityCash or shared.playerslots,
	}
end

---@param slotNum number
---@return 'vest'|'backpack'|'phone'|'cash'|nil
function M.roleForSlot(slotNum)
	local u = M.getUtilitySlots()
	if slotNum == u.vest then return 'vest' end
	if slotNum == u.backpack then return 'backpack' end
	if slotNum == u.phone then return 'phone' end
	if slotNum == u.cash then return 'cash' end
end

---@param role 'vest'|'backpack'|'phone'|'cash'
---@param itemName string
function M.itemAllowed(role, itemName)
	if not itemName or not role then return true end

	if role == 'vest' then
		return itemName == 'armour' or itemName == 'armor'
	elseif role == 'phone' then
		return itemName == 'phone'
	elseif role == 'cash' then
		return itemName == 'money'
	elseif role == 'backpack' then
		if Items.containers[itemName] then return true end
		if itemName == 'backpack' then return true end
		local lower = itemName:lower()
		return lower:find('backpack', 1, true) ~= nil
	end

	return true
end

--- Validates items landing on player utility slots (move / swap / stack source).
---@param playerInv OxInventory
---@param fromInv OxInventory
---@param toInv OxInventory
---@param fromSlot number
---@param toSlot number
---@param fromData OxInventorySlot
---@param toData OxInventorySlot?
function M.validatePlayerMove(playerInv, fromInv, toInv, fromSlot, toSlot, fromData, toData)
	if not playerInv or not playerInv.player then return true end

	if toInv == playerInv and toInv.type == 'player' then
		local r = M.roleForSlot(toSlot)
		if r and fromData and not M.itemAllowed(r, fromData.name) then
			return false
		end
	end

	if fromInv == playerInv and fromInv.type == 'player' then
		local r = M.roleForSlot(fromSlot)
		if r and toData and toData.name and not M.itemAllowed(r, toData.name) then
			return false
		end
	end

	return true
end

return M
