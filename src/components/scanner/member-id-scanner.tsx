import { useCallback, useEffect, useState } from "react";
import { QrCamera } from "#/components/scanner/qr-camera";
import { ScannerResult } from "#/components/scanner/scanner-result";
import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import {
	clearPublicKey,
	isPublicKeyAvailable,
	setPublicKey,
	verifyQRCode,
} from "#/lib/member-id/qr-verifier";
import {
	getMemberIdPublicKeyFn,
	lookupScannedMemberFn,
} from "#/lib/member-id/scanner.functions";
import type {
	LookupMemberResult,
	VerificationResult,
} from "#/lib/member-id/types";

export function MemberIdScanner() {
	const { t } = useI18n();
	const [keyReady, setKeyReady] = useState(false);
	const [keyLoading, setKeyLoading] = useState(true);
	const [keyError, setKeyError] = useState(false);
	const [result, setResult] = useState<VerificationResult | null>(null);
	const [lookup, setLookup] = useState<LookupMemberResult | null>(null);
	const [lookupLoading, setLookupLoading] = useState(false);

	const loadPublicKey = useCallback(async () => {
		setKeyLoading(true);
		setKeyError(false);
		try {
			const { publicKey } = await getMemberIdPublicKeyFn();
			setPublicKey(publicKey);
			setKeyReady(true);
		} catch (err) {
			console.error("[scanner] public key load failed", err);
			clearPublicKey();
			setKeyReady(false);
			setKeyError(true);
		} finally {
			setKeyLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadPublicKey();
		return () => {
			clearPublicKey();
		};
	}, [loadPublicKey]);

	const clearResult = useCallback(() => {
		setResult(null);
		setLookup(null);
		setLookupLoading(false);
	}, []);

	const handleScan = useCallback(async (data: string) => {
		if (!isPublicKeyAvailable()) return;

		const verification = await verifyQRCode(data);
		setResult(verification);
		setLookup(null);

		if (!verification.success || !verification.payload?.sub) {
			setLookupLoading(false);
			return;
		}

		setLookupLoading(true);
		try {
			const enriched = await lookupScannedMemberFn({
				data: { sub: verification.payload.sub },
			});
			setLookup(enriched);
		} catch (err) {
			console.error("[scanner] enrichment failed", err);
			setLookup({ status: "error", error: "lookup_failed" });
		} finally {
			setLookupLoading(false);
		}
	}, []);

	if (keyLoading) {
		return (
			<div
				className="surface-panel flex min-h-48 items-center justify-center p-6"
				aria-busy="true"
			>
				<p className="text-sm text-muted-foreground">
					{t("scanner.publicKeyLoading")}
				</p>
			</div>
		);
	}

	if (keyError || !keyReady) {
		return (
			<div className="surface-panel flex min-h-48 flex-col items-center justify-center gap-4 p-6 text-center">
				<p className="text-sm text-destructive" role="alert">
					{t("scanner.publicKeyUnavailable")}
				</p>
				<Button type="button" variant="outline" onClick={loadPublicKey}>
					{t("scanner.publicKeyRetry")}
				</Button>
			</div>
		);
	}

	return (
		<div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
			<div className="surface-panel p-4 sm:p-5">
				<QrCamera onScan={handleScan} paused={Boolean(result?.success)} />
			</div>
			<ScannerResult
				result={result}
				lookup={lookup}
				lookupLoading={lookupLoading}
				onClear={clearResult}
			/>
		</div>
	);
}
