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

export type WelcomeEmailProps = {
	firstName: string;
	username: string;
	password: string;
};

export function WelcomeEmail({
	firstName,
	username,
	password,
}: WelcomeEmailProps) {
	return (
		<Html lang="de">
			<Tailwind>
				<Head>
					<meta name="color-scheme" content="light only" />
					<meta name="supported-color-schemes" content="light only" />
					<title>Willkommen bei Neuland Ingolstadt</title>
				</Head>
				<Preview>
					Willkommen bei Neuland Ingolstadt - deine Zugangsdaten und erste
					Schritte
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
								Neuland Ingolstadt e.V.
							</Text>
							<Heading
								className="text-[26px] font-semibold m-0 tracking-[0.02em]"
								style={{ color: FG, fontFamily: "ui-monospace, monospace" }}
							>
								Willkommen bei Neuland
							</Heading>
						</Section>

						<Heading
							className="text-[20px] font-semibold m-0 mb-[12px]"
							style={{ color: BRAND_GREEN }}
						>
							Hallo {firstName}!
						</Heading>

						<Text
							className="text-[16px] leading-[24px] mb-[24px]"
							style={{ color: "#404040" }}
						>
							Herzlich willkommen bei Neuland Ingolstadt! Wir freuen uns, dass
							du Teil unseres Vereins geworden bist. In dieser E-Mail findest du
							alle wichtigen Informationen, die du für den Start benötigst.
						</Text>

						<Section
							className="p-[20px] mb-[28px]"
							style={{
								backgroundColor: AMBIENT,
								border: `1px solid ${BORDER}`,
							}}
						>
							<Text
								className="text-[12px] font-semibold m-0 mb-[12px] uppercase tracking-[0.1em]"
								style={{
									color: MUTED,
									fontFamily: "ui-monospace, monospace",
								}}
							>
								Deine Zugangsdaten
							</Text>
							<Text
								className="text-[15px] leading-[24px] m-0 mb-[6px]"
								style={{
									color: FG,
									fontFamily: "ui-monospace, monospace",
								}}
							>
								<span
									className="inline-block font-semibold mr-[8px]"
									style={{ color: MUTED }}
								>
									Username
								</span>
								<span>{username}</span>
							</Text>
							<Text
								className="text-[15px] leading-[24px] m-0"
								style={{
									color: FG,
									fontFamily: "ui-monospace, monospace",
								}}
							>
								<span
									className="inline-block font-semibold mr-[8px]"
									style={{ color: MUTED }}
								>
									Passwort
								</span>
								<span>{password}</span>
							</Text>
						</Section>

						<Section className="mb-[28px]">
							<Text
								className="text-[12px] font-semibold mb-[16px] uppercase tracking-[0.1em]"
								style={{
									color: MUTED,
									fontFamily: "ui-monospace, monospace",
								}}
							>
								Deine nächsten Schritte
							</Text>

							<Row className="mb-[20px]">
								<Column className="pr-[14px] w-[48px] align-top">
									<Text
										className="text-[15px] font-semibold w-[36px] h-[36px] leading-[36px] text-center m-0"
										style={{
											backgroundColor: BRAND_GREEN,
											color: "#ffffff",
											fontFamily: "ui-monospace, monospace",
										}}
									>
										1
									</Text>
								</Column>
								<Column>
									<Text
										className="text-[16px] font-semibold m-0 mb-[6px]"
										style={{ color: FG }}
									>
										Wiki erkunden
									</Text>
									<Text
										className="text-[15px] leading-[22px] mb-[12px]"
										style={{ color: "#404040" }}
									>
										In unserem Wiki findest du alle wichtigen Infos und
										Ressourcen:
									</Text>
									<Button
										href="https://outline.neuland.ing/collection/willkommen-93i4XP8TGL/overview"
										className="text-white font-semibold py-[12px] px-[20px] text-[15px] no-underline text-center inline-block box-border mb-[4px] w-full"
										style={{ backgroundColor: BRAND_GREEN }}
									>
										Zum Wiki →
									</Button>
								</Column>
							</Row>

							<Row className="mb-[20px]">
								<Column className="pr-[14px] w-[48px] align-top">
									<Text
										className="text-[15px] font-semibold w-[36px] h-[36px] leading-[36px] text-center m-0"
										style={{
											backgroundColor: BRAND_GREEN,
											color: "#ffffff",
											fontFamily: "ui-monospace, monospace",
										}}
									>
										2
									</Text>
								</Column>
								<Column>
									<Text
										className="text-[16px] font-semibold m-0 mb-[6px]"
										style={{ color: FG }}
									>
										Signal-Gruppe beitreten
									</Text>
									<Text
										className="text-[15px] leading-[22px] mb-[12px]"
										style={{ color: "#404040" }}
									>
										Bleib mit anderen Mitgliedern verbunden und erhalte Updates:
									</Text>
									<Button
										href="https://signal.group/#CjQKIJuYv3MToYxwinSiy0dBcELEHBd5ABfjxPnAeJTvouUjEhCWu3aGb0C5fqxfiJBjs7-l"
										className="text-white font-semibold py-[12px] px-[20px] text-[15px] no-underline text-center inline-block box-border mb-[4px] w-full"
										style={{ backgroundColor: BRAND_GREEN }}
									>
										Signal-Gruppe beitreten →
									</Button>
								</Column>
							</Row>

							<Row>
								<Column className="pr-[14px] w-[48px] align-top">
									<Text
										className="text-[15px] font-semibold w-[36px] h-[36px] leading-[36px] text-center m-0"
										style={{
											backgroundColor: BRAND_GREEN,
											color: "#ffffff",
											fontFamily: "ui-monospace, monospace",
										}}
									>
										3
									</Text>
								</Column>
								<Column>
									<Text
										className="text-[16px] font-semibold m-0 mb-[6px]"
										style={{ color: FG }}
									>
										Kurze Umfrage ausfüllen
									</Text>
									<Text
										className="text-[15px] leading-[22px] mb-[12px]"
										style={{ color: "#404040" }}
									>
										Hilf uns, dich besser kennenzulernen und Neuland zu
										verbessern:
									</Text>
									<Button
										href="https://cloud.neuland.ing/apps/forms/s/ryYX7B2eH9QDpdEBxP8y2FBE"
										className="text-white font-semibold py-[12px] px-[20px] text-[15px] no-underline text-center inline-block box-border mb-[4px] w-full"
										style={{ backgroundColor: BRAND_GREEN }}
									>
										Zur Umfrage →
									</Button>
								</Column>
							</Row>
						</Section>

						<Section
							className="p-[20px] mb-[28px]"
							style={{
								backgroundColor: AMBIENT,
								border: `1px solid ${BORDER}`,
							}}
						>
							<Text
								className="text-[16px] font-semibold m-0 mb-[6px]"
								style={{ color: FG }}
							>
								Neuland-Stammtisch
							</Text>
							<Text
								className="text-[15px] leading-[22px] m-0"
								style={{ color: "#404040" }}
							>
								Wir treffen uns regelmäßig zum Austausch über Coding, Tech und
								mehr! Die Termine werden in der Signal-Gruppe angekündigt. Wir
								würden uns sehr freuen, dich bald persönlich kennenzulernen!
							</Text>
						</Section>

						<Hr
							className="my-[28px]"
							style={{ borderColor: BORDER, borderTop: `1px solid ${BORDER}` }}
						/>

						<Text
							className="text-[15px] leading-[22px] mb-[12px]"
							style={{ color: "#404040" }}
						>
							Bis bald bei Neuland!
						</Text>

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
							Felix, Nico und Ronja
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

										<Hr
											className="my-[14px]"
											style={{
												borderColor: BORDER,
												borderTop: `1px solid ${BORDER}`,
											}}
										/>

										<Text
											className="text-[13px] leading-[20px] m-0"
											style={{ color: MUTED }}
										>
											<span style={{ color: "#888888" }}>Vorstände:</span> Felix
											Weber, Nico Märtin, Ronja Meitz
										</Text>

										<Text
											className="text-[13px] leading-[20px] m-0"
											style={{ color: MUTED }}
										>
											<span style={{ color: "#888888" }}>Registergericht:</span>{" "}
											Amtsgericht Ingolstadt
										</Text>
										<Text
											className="text-[13px] leading-[20px] m-0"
											style={{ color: MUTED }}
										>
											<span style={{ color: "#888888" }}>Registernummer:</span>{" "}
											VR 201088
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

export const welcomeEmailPreviewProps: WelcomeEmailProps = {
	firstName: "Max",
	username: "max.mustermann",
	password: "Neuland2025!",
};

WelcomeEmail.PreviewProps = welcomeEmailPreviewProps;

export default WelcomeEmail;
