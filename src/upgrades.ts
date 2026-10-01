import type { CompanionStaticUpgradeScript } from '@companion-module/base'
import type { ModuleConfig } from './config.js'

/**
 * Never remove an upgrade script once it has shipped: the index of each one is what Companion records
 * against a connection.
 */
export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig>[] = []
