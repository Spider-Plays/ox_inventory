if not lib then return end

local Inventory = require 'modules.inventory.server'

local function getCfg()
    local cfg = shared.config and shared.config.discordlogs
    if cfg then
        return cfg.enabled, cfg.webhook or '', cfg.footer or 'Inventory Logs', cfg.username or 'Inventory Logs', cfg.avatar or '', cfg.webhooks or {}
    end

    local enabled = GetConvarInt('inventory:discordlogs', 0) == 1
    local webhook = GetConvar('inventory:discordwebhook', '')
    local footer = GetConvar('inventory:discordlogs:footer', 'Inventory Logs')
    local username = GetConvar('inventory:discordlogs:username', 'Inventory Logs')
    local avatar = GetConvar('inventory:discordlogs:avatar', '')
    return enabled, webhook, footer, username, avatar, {}
end

local function fmtCoord(v)
    if not v then return 'Unknown' end
    return ('%.2f, %.2f, %.2f'):format(v.x + 0.0, v.y + 0.0, v.z + 0.0)
end

local function fmtCoordBox(v)
    if not v then return '`Unknown`' end
    return ('`%.2f, %.2f, %.2f`'):format(v.x + 0.0, v.y + 0.0, v.z + 0.0)
end

local function formatMetadata(metadata)
    if type(metadata) ~= 'table' then
        return 'No metadata available'
    end

    local keys = {}
    for k in pairs(metadata) do keys[#keys + 1] = k end
    if #keys == 0 then return 'No metadata available' end
    table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)

    local lines = table.create(#keys, 0)
    for i = 1, #keys do
        local k = keys[i]
        local v = metadata[k]
        if type(v) == 'table' then
            local ok, enc = pcall(json.encode, v)
            v = ok and enc or '[table]'
        end
        lines[i] = ('%s: %s'):format(k, tostring(v))
    end
    return table.concat(lines, '\n')
end

local function formatMetadataBox(metadata)
    local text = formatMetadata(metadata)
    if text == 'No metadata available' then return text end
    return ('```%s```'):format(text)
end

local function sendDiscord(embed, category)
    local enabled, webhook, footer, username, avatar, webhooks = getCfg()
    if not enabled then return end

    local chosen = webhook
    if category and webhooks and webhooks[category] and webhooks[category] ~= '' then
        chosen = webhooks[category]
    end

    if not chosen or chosen == '' then return end

    embed.footer = embed.footer or { text = footer .. ' - ' .. os.date('%x %X') }
    embed.timestamp = os.date('!%Y-%m-%dT%H:%M:%SZ')

    local payload = {
        username = username,
        avatar_url = avatar ~= '' and avatar or nil,
        embeds = { embed },
    }

    PerformHttpRequest(chosen, function() end, 'POST', json.encode(payload), { ['Content-Type'] = 'application/json' })
end

local function getPlayerInv(source)
    if type(source) ~= 'number' then source = tonumber(source) end
    if not source then return end
    return Inventory(source)
end

local function buildCharacterBlock(inv, source)
    local name = inv?.player?.name or GetPlayerName(source) or ('Player %s'):format(source)
    local id = inv?.owner or 'Unknown'
    return ('Name: %s\nID: %s\nServer ID: %s'):format(name, id, source)
end

local function buildItemBlock(slot, count)
    local itemName = slot?.name or 'Unknown'
    local amount = count or slot?.count or 1
    return ('Item: %s\nAmount: %s'):format(itemName, tostring(amount))
end

local function classifySwap(payload)
    local fromType = payload.fromType
    local toType = payload.toType
    local action = payload.action

    if toType == 'drop' or toType == 'newdrop' or payload.toInventory == 'newdrop' or payload.dropId then
        return '🔻 Item Dropped', 0xE74C3C, 'drop'
    end

    if fromType == 'drop' then
        return '🔺 Item Picked Up', 0x2ECC71, 'pickup'
    end

    if action == 'give' or (fromType == 'player' and toType == 'player') then
        return '🤝 Item Transferred', 0xF1C40F, 'transfer'
    end

    if toType == 'stash' then
        return '📥 Item Stored in Stash', 0x3498DB, 'stash'
    end
    if fromType == 'stash' then
        return '📤 Item Retrieved from Stash', 0x9B59B6, 'stash'
    end

    if toType == 'trunk' then
        return '🚗 Item Stored in Vehicle Trunk', 0x8E44AD, 'trunk'
    end
    if fromType == 'trunk' then
        return '🚗 Item Retrieved from Vehicle Trunk', 0x8E44AD, 'trunk'
    end

    if toType == 'glovebox' then
        return '🚘 Item Stored in Glovebox', 0xE67E22, 'glovebox'
    end
    if fromType == 'glovebox' then
        return '🚘 Item Retrieved from Glovebox', 0xE67E22, 'glovebox'
    end

    return '📦 Item Moved', 0x95A5A6, 'move'
end

local function register()
    local enabled = shared.config and shared.config.discordlogs and shared.config.discordlogs.enabled
    if enabled == nil then enabled = GetConvarInt('inventory:discordlogs', 0) == 1 end
    if not enabled then return end

    local ok = pcall(function()
        exports[shared.resource]:registerHook('swapItems', function(payload)
            local src = tonumber(payload.source) or tonumber(payload.fromInventory) or tonumber(payload.inventoryId)
            if not src then return true end

            local inv = getPlayerInv(src)
            if not inv then return true end

            local title, color, category = classifySwap(payload)
            local fromSlot = payload.fromSlot
            local count = payload.count or fromSlot?.count

            local coords = GetEntityCoords(GetPlayerPed(src))
            local meta = fromSlot?.metadata

            local fields = {
                { name = 'Character Information', value = buildCharacterBlock(inv, src), inline = true },
                { name = 'Item Details', value = buildItemBlock(fromSlot, count), inline = true },
                { name = 'Location', value = fmtCoordBox(coords), inline = false },
                { name = 'Metadata', value = formatMetadataBox(meta), inline = false },
            }

            if title == '🤝 Item Transferred' then
                local toSrc = tonumber(payload.toInventory)
                if toSrc then
                    local toInv = getPlayerInv(toSrc)
                    local recv = toInv and buildCharacterBlock(toInv, toSrc) or ('Server ID: %s'):format(toSrc)
                    local recvCoords = GetEntityCoords(GetPlayerPed(toSrc))
                    fields = {
                        { name = 'Sender Information', value = buildCharacterBlock(inv, src), inline = true },
                        { name = 'Receiver Information', value = recv, inline = true },
                        { name = 'Item Details', value = buildItemBlock(fromSlot, count), inline = true },
                        { name = 'Sender Location', value = fmtCoordBox(coords), inline = true },
                        { name = 'Receiver Location', value = fmtCoordBox(recvCoords), inline = true },
                        { name = 'Metadata', value = formatMetadataBox(meta), inline = false },
                    }
                end
            end

            sendDiscord({
                title = title,
                color = color,
                fields = fields,
            }, category)

            return true
        end)

        exports[shared.resource]:registerHook('usingItem', function(payload)
            local src = tonumber(payload.source)
            if not src then return true end

            local inv = getPlayerInv(src)
            if not inv then return true end

            local item = payload.item
            local coords = GetEntityCoords(GetPlayerPed(src))

            sendDiscord({
                title = '✅ Item Used',
                color = 0x2ECC71,
                fields = {
                    { name = 'Character Information', value = buildCharacterBlock(inv, src), inline = true },
                    { name = 'Item Details', value = buildItemBlock(item, payload.consume or 1), inline = true },
                    { name = 'Location', value = fmtCoordBox(coords), inline = false },
                    { name = 'Metadata', value = formatMetadataBox(item?.metadata), inline = false },
                },
            }, 'use')

            return true
        end)

        exports[shared.resource]:registerHook('craftItem', function(payload)
            local src = tonumber(payload.source)
            if not src then return true end
            local inv = getPlayerInv(src)
            if not inv then return true end
            local coords = GetEntityCoords(GetPlayerPed(src))

            sendDiscord({
                title = '🛠️ Item Crafted',
                color = 0x1ABC9C,
                fields = {
                    { name = 'Character Information', value = buildCharacterBlock(inv, src), inline = true },
                    { name = 'Item Details', value = ('Recipe: %s'):format(payload.recipe?.name or payload.recipe or 'Unknown'), inline = true },
                    { name = 'Location', value = fmtCoordBox(coords), inline = false },
                    { name = 'Metadata', value = formatMetadataBox(payload.metadata), inline = false },
                },
            }, 'craft')

            return true
        end)

        exports[shared.resource]:registerHook('buyItem', function(payload)
            local src = tonumber(payload.source)
            if not src then return true end
            local inv = getPlayerInv(src)
            if not inv then return true end
            local coords = GetEntityCoords(GetPlayerPed(src))

            local itemName = payload.itemName or payload.item?.name or 'Unknown'
            local amount = payload.count or 1

            sendDiscord({
                title = '🛒 Item Purchased',
                color = 0x3498DB,
                fields = {
                    { name = 'Character Information', value = buildCharacterBlock(inv, src), inline = true },
                    { name = 'Item Details', value = ('Item: %s\nAmount: %s'):format(itemName, tostring(amount)), inline = true },
                    { name = 'Location', value = fmtCoordBox(coords), inline = false },
                    { name = 'Metadata', value = formatMetadataBox(payload.metadata), inline = false },
                },
            }, 'buy')

            return true
        end)
    end)

    if not ok then
        warn('[ox_inventory] discord logs failed to register hooks (is hooks module loaded?)')
    end
end

register()

