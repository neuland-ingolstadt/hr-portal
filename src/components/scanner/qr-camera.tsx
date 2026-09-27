import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import { cn } from "#/lib/utils";

type QrCameraProps = {
	onScan: (data: string) => void;
	paused?: boolean;
	className?: string;
};

function cameraErrorKey(err: unknown): MessageKey {
	if (!(err instanceof Error)) return "scanner.cameraErrorGeneric";
	if (err.message.includes("Camera API not supported")) {
		return "scanner.cameraErrorUnsupported";
	}
	if (err.name === "NotAllowedError") return "scanner.cameraErrorDenied";
	if (err.name === "NotFoundError") return "scanner.cameraErrorNotFound";
	if (err.name === "NotReadableError") return "scanner.cameraErrorBusy";
	return "scanner.cameraErrorGeneric";
}

export function QrCamera({ onScan, paused = false, className }: QrCameraProps) {
	const { t } = useI18n();
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const lastScanTime = useRef(0);
	const [isScanning, setIsScanning] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [errorKey, setErrorKey] = useState<MessageKey | null>(null);

	const stopCamera = useCallback(() => {
		if (videoRef.current?.srcObject) {
			const stream = videoRef.current.srcObject as MediaStream;
			for (const track of stream.getTracks()) track.stop();
			videoRef.current.srcObject = null;
		}
		setIsScanning(false);
	}, []);

	const startCamera = useCallback(async () => {
		try {
			if (!navigator.mediaDevices?.getUserMedia) {
				throw new Error("Camera API not supported");
			}

			const constraints: MediaStreamConstraints = {
				video: {
					width: { ideal: 1280 },
					height: { ideal: 720 },
					facingMode: { ideal: "environment" },
				},
			};

			let stream: MediaStream;
			try {
				stream = await navigator.mediaDevices.getUserMedia(constraints);
			} catch {
				(constraints.video as MediaTrackConstraints).facingMode = {
					ideal: "user",
				};
				stream = await navigator.mediaDevices.getUserMedia(constraints);
			}

			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				setIsScanning(true);
				setErrorKey(null);
			}
		} catch (err) {
			setErrorKey(cameraErrorKey(err));
			console.error("Camera error:", err);
		}
	}, []);

	useEffect(() => {
		void startCamera();
		return () => {
			stopCamera();
		};
	}, [startCamera, stopCamera]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				setIsVisible(entry.isIntersecting);
			},
			{ threshold: 0.1 },
		);
		if (containerRef.current) observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, []);

	const captureFrame = useCallback(() => {
		if (!videoRef.current || !canvasRef.current || isProcessing || paused) {
			return;
		}

		const canvas = canvasRef.current;
		const video = videoRef.current;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;
		if (video.videoWidth === 0 || video.videoHeight === 0) return;

		const now = Date.now();
		if (now - lastScanTime.current < 800) return;

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const code = jsQR(imageData.data, imageData.width, imageData.height);

		if (
			code?.data &&
			typeof code.data === "string" &&
			code.data.trim().length > 0
		) {
			lastScanTime.current = now;
			setIsProcessing(true);
			onScan(code.data);
			window.setTimeout(() => setIsProcessing(false), 1200);
		}
	}, [isProcessing, onScan, paused]);

	useEffect(() => {
		if (!isScanning || isProcessing || paused) return;

		let raf = 0;
		let lastFrameTime = 0;

		const tick = (currentTime: number) => {
			const frameInterval = isVisible ? 100 : 1000;
			if (currentTime - lastFrameTime >= frameInterval) {
				captureFrame();
				lastFrameTime = currentTime;
			}
			raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [captureFrame, isProcessing, isScanning, isVisible, paused]);

	if (errorKey) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-4 p-8 text-center",
					className,
				)}
			>
				<p className="text-sm text-destructive" role="alert">
					{t(errorKey)}
				</p>
				<Button type="button" variant="outline" size="sm" onClick={startCamera}>
					{t("scanner.cameraRetry")}
				</Button>
			</div>
		);
	}

	return (
		<div ref={containerRef} className={cn("relative w-full", className)}>
			<div className="relative mx-auto max-w-md overflow-hidden border border-border bg-black">
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					aria-label={t("scanner.title")}
					className="aspect-[4/3] w-full object-cover"
				/>
				<canvas ref={canvasRef} className="hidden" />

				{isScanning ? (
					<div className="absolute top-3 right-3">
						<div
							className={cn(
								"size-2.5",
								isVisible && !paused
									? "animate-pulse bg-primary"
									: "bg-muted-foreground",
							)}
						/>
					</div>
				) : null}

				{!isScanning ? (
					<div className="absolute inset-0 flex items-center justify-center bg-black/80">
						<p className="font-mono text-sm text-white">
							{t("scanner.cameraStarting")}
						</p>
					</div>
				) : null}

				{isVisible && !paused ? (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<div className="relative h-52 w-52 border border-white/25">
							<span className="absolute -top-0.5 -left-0.5 h-6 w-6 border-t-2 border-l-2 border-primary" />
							<span className="absolute -top-0.5 -right-0.5 h-6 w-6 border-t-2 border-r-2 border-primary" />
							<span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 border-b-2 border-l-2 border-primary" />
							<span className="absolute -right-0.5 -bottom-0.5 h-6 w-6 border-r-2 border-b-2 border-primary" />
						</div>
					</div>
				) : null}
			</div>

			<div className="mt-3 space-y-1 text-center">
				<p className="text-sm text-foreground">{t("scanner.cameraHint")}</p>
				<p className="text-xs text-muted-foreground">
					{t("scanner.cameraHintFrame")}
				</p>
			</div>
		</div>
	);
}
