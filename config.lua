-- Central configuration for ox_inventory customizations.
-- This is safe to edit; unlike init.lua.

local Config = {
  ui = {
    -- Grid sizing (applied at runtime via CSS variables in NUI).
    gridCols = 5,
    -- These are expressed as "design pixels" and converted to responsive vp() on the NUI side.
    gridSize = 96,
    gridGap = 9,

    -- Visible rows before scrolling.
    visibleRowsMain = 4,
    visibleRowsBackpack = 4,
  },

  -- Keyboard behavior. (Client can optionally use this later for other tweaks.)
  keys = {
    tabTogglesInventory = true,
    escapeClosesInventory = true,
  },

  discordlogs = {
    enabled = true,

    -- Default webhook used if an event-specific webhook is not set.
    webhook = 'https://discord.com/api/webhooks/1493209502022107257/noBhGm66BGzhDB7rxHKFqxI7TVoFwPHwdofUi4tsNB-FDKuaAsjMWQuqO0g2RK-Rtr8Q',

    -- Optional per-category webhooks (leave '' to use default webhook).
    webhooks = {
      drop = '',
      pickup = '',
      transfer = '',
      stash = '',
      trunk = '',
      glovebox = '',
      use = '',
      craft = '',
      buy = '',
      move = '',
    },

    username = 'Spider Inventory Logs',
    avatar = '',
    footer = 'Spider Inventory Logs',
  },
}

-- Backwards compatibility: if you previously tuned SCSS to a different size, you can override here.
-- Example:
-- Config.ui.gridSize = 96
-- Config.ui.gridGap = 9

-- Optional convar overrides (keep compatibility with previous convar-based setup).
-- inventory:discordlogs (0/1)
-- inventory:discordwebhook (url)
-- inventory:discordlogs:username (string)
-- inventory:discordlogs:avatar (url)
-- inventory:discordlogs:footer (string)
do
  local enabled = GetConvarInt('inventory:discordlogs', -1)
  if enabled ~= -1 then Config.discordlogs.enabled = enabled == 1 end

  local webhook = GetConvar('inventory:discordwebhook', '')
  if webhook ~= '' then Config.discordlogs.webhook = webhook end

  local username = GetConvar('inventory:discordlogs:username', '')
  if username ~= '' then Config.discordlogs.username = username end

  local avatar = GetConvar('inventory:discordlogs:avatar', '')
  if avatar ~= '' then Config.discordlogs.avatar = avatar end

  local footer = GetConvar('inventory:discordlogs:footer', '')
  if footer ~= '' then Config.discordlogs.footer = footer end
end

return Config

