export type QRPayload = {
	sub: string;
	name: string;
	iat: number;
	exp: number;
	type: QRType;
};

export enum QRType {
	APP = "app",
	APPLE_WALLET = "apple_wallet",
	ANDROID_WALLET = "android_wallet",
}

export type VerificationResult = {
	success: boolean;
	payload: QRPayload | null;
	error?: string;
};

export type ScannedMember = {
	id: string;
	name: string;
	groups: string[];
	isActive: boolean;
	isMitglied: boolean;
	source: "authentik" | "mock";
};

export type LookupMemberResult =
	| { status: "found"; member: ScannedMember }
	| { status: "not_found"; source: "authentik" | "mock" }
	| { status: "error"; error: "authentik_api_missing" | "lookup_failed" };
