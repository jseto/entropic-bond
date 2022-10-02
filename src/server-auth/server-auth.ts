import { UserCredentials } from '../auth/user-auth-types'

export interface CustomCredentials {
	[ key: string ]: unknown
}

export abstract class ServerAuthService {
	abstract setCustomCredentials( userId: string, customCredentials: CustomCredentials ): Promise<void>
	abstract getUser( userId: string ): Promise<UserCredentials>
	abstract updateUser( userId: string, credentials: UserCredentials ): Promise<UserCredentials>
}

export class ServerAuth extends ServerAuthService {
	protected constructor(){ super() }

	static registerserverAuthService( authService: ServerAuthService ) {
		if ( ServerAuth._authService != authService ) {
			ServerAuth._authService = authService
			this._instance = undefined
		}
	}

	static get instance() {
		return this._instance || (this._instance = new this() )
	}

	getUser( userId: string ): Promise<UserCredentials> {
		return ServerAuth._authService.getUser( userId )
	}

	updateUser( userId: string, credentials: UserCredentials ): Promise<UserCredentials> {
		return ServerAuth._authService.updateUser( userId, credentials )
	}

	setCustomCredentials( userId: string, customCredentials: CustomCredentials ): Promise<void> {
		return ServerAuth._authService.setCustomCredentials( userId, customCredentials )
	}

	private static _instance: ServerAuth = null
	private static _authService: ServerAuthService
}