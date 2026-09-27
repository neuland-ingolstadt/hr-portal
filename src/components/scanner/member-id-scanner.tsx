import { useCallback, useEffect, useRef, useState } from "react";
import { QrCamera } from "#/components/scanner/qr-camera";
import { ScanHistoryList } from "#/components/scanner/scan-history";
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
import { useScanHistory } from "#/lib/member-id/use-scan-history";

const RESCAN_COOLDOWN_MS = 2000;

export function MemberIdScanner() {
	const { t } = useI18n();
	const { entries, addScan, clearHistory } = useScanHistory();
	const [keyReady, setKeyReady] = useState(false);
	const [keyLoading, setKeyLoading] = useState(true);
	const [keyError, setKeyError] = useState(false);
	const [result, setResult] = useState<VerificationResult | null>(null);
	const [lookup, setLookup] = useState<LookupMemberResult | null>(null);
	const [lookupLoading, setLookupLoading] = useState(false);
	const [isDuplicate, setIsDuplicate] = useState(false);
	const [cooldown, setCooldown] = useState(false);
	const cooldownTimer = useRef<number | null>(null);

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
			if (cooldownTimer.current != null) {
				window.clearTimeout(cooldownTimer.current);
			}
		};
	}, [loadPublicKey]);

	const startCooldown = useCallback(() => {
		setCooldown(true);
		if (cooldownTimer.current != null) {
			window.clearTimeout(cooldownTimer.current);
		}
		cooldownTimer.current = window.setTimeout(() => {
			setCooldown(false);
			cooldownTimer.current = null;
		}, RESCAN_COOLDOWN_MS);
	}, []);

	const handleScan = useCallback(
		async (data: string) => {
			if (!isPublicKeyAvailable() || cooldown) return;

			startCooldown();

			const verification = await verifyQRCode(data);
			const willLookup =
				verification.success && Boolean(verification.payload?.sub);

			// Batch with result so the enrich skeleton appears in the same paint.
			setLookupLoading(willLookup);
			setResult(verification);
			setLookup(null);
			setIsDuplicate(false);

			if (verification.payload?.sub) {
				const { isDuplicate: duplicate } = addScan({
					sub: verification.payload.sub,
					name: verification.payload.name,
					success: verification.success,
				});
				setIsDuplicate(duplicate && verification.success);
			}

			if (!willLookup || !verification.payload?.sub) {
				return;
			}

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
		},
		[addScan, cooldown, startCooldown],
	);

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
		<div className="space-y-4">
			<div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
				<div className="surface-panel p-4 sm:p-5">
					<QrCamera onScan={handleScan} paused={cooldown} />
				</div>
				<ScannerResult
					result={result}
					lookup={lookup}
					lookupLoading={lookupLoading}
					isDuplicate={isDuplicate}
				/>
			</div>
			<ScanHistoryList entries={entries} onClear={clearHistory} />
		</div>
	);
}
