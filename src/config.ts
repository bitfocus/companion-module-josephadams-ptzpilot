import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
}

export const DEFAULT_PORT = 8765

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value:
				'Connects to PTZ Pilot, which flies VISCA PTZ cameras with game controllers. Turn on its API under Settings in PTZ Pilot. To connect from another computer, also allow connections from other computers there.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP Address / Hostname',
			width: 6,
			default: '127.0.0.1',
			regex: Regex.IP.slice(0, Regex.IP.length - 1) + '|' + Regex.HOSTNAME.slice(1, Regex.HOSTNAME.length),
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			min: 1,
			max: 65535,
			default: DEFAULT_PORT,
			width: 3,
		},
	]
}
