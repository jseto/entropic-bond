import { Observable } from '../observable/observable'
import { AuthProvider, SignData, UserCredentials } from "./user-auth-types"

export abstract class AuthService {
	abstract signUp( signData: SignData ): Promise<UserCredentials>
	abstract login( signData: SignData ): Promise<UserCredentials>
	abstract logout(): Promise<void>
	abstract linkAdditionalProvider<T>( provider: AuthProvider ): Promise<T>
	abstract unlinkProvider<T>( provider: AuthProvider ): Promise<T>
	abstract onAuthStateChange( onChange: (userCredentials: UserCredentials) => void ): void
}

export type AuthErrorCode = 'wrongPassword' | 'popupClosedByUser' | 'userNotFound' | 'invalidEmail'

export interface AuthError {
	code: AuthErrorCode
	message: string
}

export type ResovedCallback = ( credentials: UserCredentials ) => void
export type RejectedCallback = ( reason: AuthError ) => void

export class Auth extends AuthService {
	protected constructor() {
		super()
		if (!Auth._authService ) throw (new Error('You should register an auth service before using Auth.'))
		Auth._authService.onAuthStateChange( 
			userCredentials => this.authStateChanged( userCredentials ) 
		)
	}

	static registerAuthService( authService: AuthService ) {
		if ( Auth._authService != authService ) {
			Auth._authService = authService
			this._instance = undefined
		}
	}

	static get instance() {
		return this._instance || (this._instance = new this() )
	}

	signUp( singData: SignData ): Promise<UserCredentials> {
		return Auth._authService.signUp( singData )
	}

	login( singData: SignData ): Promise<UserCredentials> {
		return Auth._authService.login( singData )
	}
	
	logout(): Promise<void> {
		return Auth._authService.logout()
	}

	onAuthStateChange( onChange: ( userCredentials: UserCredentials )=>void ) {
		return this._onAuthStateChange.subscribe( onChange )
	}

	removeAuthStateChange( onChange: ( userCredentials: UserCredentials )=>void ) {
		this._onAuthStateChange.unsubscribe( onChange )
	}

	linkAdditionalProvider<T>( provider: AuthProvider ): Promise<T> {
		return Auth._authService.linkAdditionalProvider<T>( provider )
	}

	unlinkProvider<T>( provider: AuthProvider ): Promise<T> {
		return Auth._authService.unlinkProvider<T>( provider )
	}

	private authStateChanged( userCredentials: UserCredentials ) {
		this._onAuthStateChange.notify( userCredentials )
	}

	private static _instance: Auth = null
	private static _authService: AuthService
	private _onAuthStateChange: Observable<UserCredentials> = new Observable<UserCredentials>()
}