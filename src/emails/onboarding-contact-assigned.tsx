import {
	Body,
	Button,
	Column,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Row,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";

/** Light-theme Neuland primary (matches app `--primary` in light mode). */
const BRAND_GREEN = "#2e8f5c";
const AMBIENT = "#f5f8f5";
const BORDER = "#e5e5e5";
const MUTED = "#666666";
const FG = "#1a1a1a";

export type OnboardingContactAssignedEmailProps = {
	/** Mentor greeting name (first name of the assigned staff contact). */
	mentorFirstName: string;
	/** Mentee first name only - privacy-minimal. */
	menteeFirstName: string;
	/** Display name of the staff member who made the assignment. */
	assignedByName: string;
	/** Deep link into the HR portal onboarding board. */
	onboardingUrl: string;
};

export function OnboardingContactAssignedEmail({
	mentorFirstName,
	menteeFirstName,
	assignedByName,
	onboardingUrl,
}: OnboardingContactAssignedEmailProps) {
	return (
		<Html lang="de">
			<Tailwind>
				<Head>
					<meta name="color-scheme" content="light only" />
					<meta name="supported-color-schemes" content="light only" />
					<title>Neue Onboarding-Betreuung zugewiesen</title>
				</Head>
				<Preview>
					Du wurdest als Betreuung für {menteeFirstName} eingetragen
				</Preview>
				<Body
					className="font-sans py-[40px]"
					style={{ backgroundColor: AMBIENT }}
				>
					<Container
						className="mx-auto my-0 max-w-[600px] p-[32px]"
						style={{
							backgroundColor: "#ffffff",
							border: `1px solid ${BORDER}`,
							borderTop: `3px solid ${BRAND_GREEN}`,
						}}
					>
						<Section className="mb-[28px] text-center">
							<Img
								src="https://neuland-ingolstadt.de/favicon.svg"
								alt="Neuland Logo"
								width="72"
								height="auto"
								className="w-[72px] h-auto mx-auto mb-[16px]"
							/>
							<Text
								className="m-0 mb-[8px] text-[11px] font-semibold uppercase tracking-[0.12em]"
								style={{ color: MUTED, fontFamily: "ui-monospace, monospace" }}
							>
								Neuland Ingolstadt e.V. · HR Portal
							</Text>
							<Heading
								className="text-[26px] font-semibold m-0 tracking-[0.02em]"
								style={{ color: FG, fontFamily: "ui-monospace, monospace" }}
							>
								Onboarding-Betreuung
							</Heading>
						</Section>

						<Heading
							className="text-[20px] font-semibold m-0 mb-[12px]"
							style={{ color: BRAND_GREEN }}
						>
							Hallo {mentorFirstName}!
						</Heading>

						<Text
							className="text-[16px] leading-[24px] mb-[16px]"
							style={{ color: "#404040" }}
						>
							{assignedByName} hat dich als Betreuung für{" "}
							<span style={{ color: FG, fontWeight: 600 }}>
								{menteeFirstName}
							</span>{" "}
							eingetragen.
						</Text>

						<Text
							className="text-[16px] leading-[24px] mb-[24px]"
							style={{ color: "#404040" }}
						>
							Öffne das HR-Portal für alle Details und den Onboarding-Überblick.
						</Text>

						<Section className="mb-[28px]">
							<Button
								href={onboardingUrl}
								className="text-white font-semibold py-[12px] px-[20px] text-[15px] no-underline text-center inline-block box-border w-full"
								style={{ backgroundColor: BRAND_GREEN }}
							>
								Zum Onboarding →
							</Button>
						</Section>

						<Hr
							className="my-[28px]"
							style={{ borderColor: BORDER, borderTop: `1px solid ${BORDER}` }}
						/>

						<Text
							className="text-[15px] leading-[22px] mb-[4px]"
							style={{ color: "#404040" }}
						>
							Viele Grüße
						</Text>

						<Text
							className="text-[15px] leading-[22px] font-semibold m-0"
							style={{ color: BRAND_GREEN }}
						>
							Neuland HR Portal
						</Text>

						<Section className="mt-[24px]">
							<Hr
								className="my-[24px]"
								style={{
									borderColor: BORDER,
									borderTop: `1px solid ${BORDER}`,
								}}
							/>

							<Section
								className="p-[20px]"
								style={{
									backgroundColor: AMBIENT,
									border: `1px solid ${BORDER}`,
								}}
							>
								<Row>
									<Column>
										<Img
											src="https://neuland-ingolstadt.de/favicon.svg"
											alt="Neuland Logo"
											width="48"
											height="auto"
											className="w-[48px] h-auto mb-[12px]"
										/>

										<Text
											className="text-[14px] leading-[20px] font-semibold m-0 mb-[6px]"
											style={{ color: FG }}
										>
											Neuland Ingolstadt e.V.
										</Text>

										<Text
											className="text-[13px] leading-[20px] m-0"
											style={{ color: MUTED }}
										>
											Esplanade 10
										</Text>
										<Text
											className="text-[13px] leading-[20px] m-0 mb-[12px]"
											style={{ color: MUTED }}
										>
											85049 Ingolstadt
										</Text>

										<Text className="text-[13px] leading-[20px] m-0">
											<Link
												href="mailto:info@neuland-ingolstadt.de"
												className="no-underline"
												style={{ color: BRAND_GREEN }}
											>
												info@neuland-ingolstadt.de
											</Link>
										</Text>
									</Column>
								</Row>
							</Section>
						</Section>
					</Container>

					<Container className="max-w-[600px] mx-auto mt-[24px] text-center">
						<Text className="text-[13px] m-0" style={{ color: MUTED }}>
							© {new Date().getFullYear()} Neuland Ingolstadt e.V. Alle Rechte
							vorbehalten.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}

export const onboardingContactAssignedPreviewProps: OnboardingContactAssignedEmailProps =
	{
		mentorFirstName: "Sam",
		menteeFirstName: "Alex",
		assignedByName: "Jordan Weiss",
		onboardingUrl: "http://127.0.0.1:43127/onboarding",
	};

OnboardingContactAssignedEmail.PreviewProps =
	onboardingContactAssignedPreviewProps;

export default OnboardingContactAssignedEmail;
