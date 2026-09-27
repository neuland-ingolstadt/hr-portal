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
					Willkommen bei Neuland Ingolstadt — deine Zugangsdaten und erste
					Schritte
				</Preview>
				<Body className="bg-white font-sans py-[40px]">
					<Container className="bg-gray-50 rounded-[12px] p-[32px] mx-auto my-0 max-w-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
						<Section className="mb-[32px] p-[24px] text-center">
							<Img
								src="https://neuland-ingolstadt.de/favicon.svg"
								alt="Neuland Logo"
								width="120"
								height="auto"
								className="w-[120px] h-auto mx-auto mb-[16px]"
							/>
							<Heading className="text-[28px] font-bold m-0">
								Willkommen bei Neuland!
							</Heading>
						</Section>

						<Heading className="text-[24px] font-bold text-blue-500 m-0 mb-[16px]">
							Hallo {firstName}!
						</Heading>

						<Text className="text-[16px] leading-[24px] text-gray-700 mb-[24px]">
							Herzlich willkommen bei Neuland Ingolstadt! Wir freuen uns, dass
							du Teil unseres Vereins geworden bist. In dieser E-Mail findest du
							alle wichtigen Informationen, die du für den Start benötigst.
						</Text>

						<Section className="bg-gray-100 border border-gray-300 rounded-[8px] p-[24px] mb-[32px]">
							<Text className="text-[18px] font-bold m-0 mb-[16px]">
								Deine Zugangsdaten
							</Text>
							<Text className="text-[16px] leading-[24px] text-gray-700 m-0 mb-[8px] font-mono">
								<span className="inline-block font-bold mr-[8px] mt-[12px]">
									Username:
								</span>
								<span>{username}</span>
							</Text>
							<Text className="text-[16px] leading-[24px] text-gray-700 m-0 font-mono">
								<span className="inline-block font-bold mr-[8px]">
									Passwort:
								</span>
								<span>{password}</span>
							</Text>
						</Section>

						<Section className="mb-[32px]">
							<Text className="text-[22px] font-bold text-blue-600 mb-[16px]">
								Deine nächsten Schritte
							</Text>

							<Row className="mb-[24px]">
								<Column className="pr-[16px] w-[60px] align-top">
									<Text className="bg-blue-600 text-white text-[18px] font-bold rounded-full w-[40px] h-[40px] leading-[40px] text-center m-0">
										1
									</Text>
								</Column>
								<Column>
									<Text className="text-[18px] font-bold text-gray-800 m-0 mb-[8px]">
										Wiki erkunden
									</Text>
									<Text className="text-[16px] leading-[24px] text-gray-700 mb-[16px]">
										In unserem Wiki findest du alle wichtigen Infos und
										Ressourcen:
									</Text>
									<Button
										href="https://outline.neuland.ing/collection/willkommen-93i4XP8TGL/overview"
										className="bg-blue-600 hover:bg-blue-700 rounded-[6px] text-white font-bold py-[12px] px-[24px] text-[16px] no-underline text-center inline-block box-border mb-[8px] shadow-[0_4px_6px_rgba(37,99,235,0.25)] transition-all w-full"
									>
										Zum Wiki →
									</Button>
								</Column>
							</Row>

							<Row className="mb-[24px]">
								<Column className="pr-[16px] w-[60px] align-top">
									<Text className="bg-green-500 text-white text-[18px] font-bold rounded-full w-[40px] h-[40px] leading-[40px] text-center m-0">
										2
									</Text>
								</Column>
								<Column>
									<Text className="text-[18px] font-bold text-gray-800 m-0 mb-[8px]">
										Signal-Gruppe beitreten
									</Text>
									<Text className="text-[16px] leading-[24px] text-gray-700 mb-[16px]">
										Bleib mit anderen Mitgliedern verbunden und erhalte Updates:
									</Text>
									<Button
										href="https://signal.group/#CjQKIJuYv3MToYxwinSiy0dBcELEHBd5ABfjxPnAeJTvouUjEhCWu3aGb0C5fqxfiJBjs7-l"
										className="bg-green-500 hover:bg-green-600 rounded-[6px] text-white font-bold py-[12px] px-[24px] text-[16px] no-underline text-center inline-block box-border mb-[8px] shadow-[0_4px_6px_rgba(16,185,129,0.25)] transition-all w-full"
									>
										Signal-Gruppe beitreten →
									</Button>
								</Column>
							</Row>

							<Row>
								<Column className="pr-[16px] w-[60px] align-top">
									<Text className="bg-purple-500 text-white text-[18px] font-bold rounded-full w-[40px] h-[40px] leading-[40px] text-center m-0">
										3
									</Text>
								</Column>
								<Column>
									<Text className="text-[18px] font-bold text-gray-800 m-0 mb-[8px]">
										Kurze Umfrage ausfüllen
									</Text>
									<Text className="text-[16px] leading-[24px] text-gray-700 mb-[16px]">
										Hilf uns, dich besser kennenzulernen und Neuland zu
										verbessern:
									</Text>
									<Button
										href="https://cloud.neuland.ing/apps/forms/s/ryYX7B2eH9QDpdEBxP8y2FBE"
										className="bg-purple-500 hover:bg-purple-600 rounded-[6px] text-white font-bold py-[12px] px-[24px] text-[16px] no-underline text-center inline-block box-border mb-[8px] shadow-[0_4px_6px_rgba(139,92,246,0.25)] transition-all w-full"
									>
										Zur Umfrage →
									</Button>
								</Column>
							</Row>
						</Section>

						<Section className="bg-gray-100 p-[24px] rounded-[8px] mb-[32px]">
							<Text className="text-[18px] font-bold text-gray-800 m-0 mb-[8px]">
								Neuland-Stammtisch
							</Text>
							<Text className="text-[16px] leading-[24px] text-gray-700 m-0">
								Wir treffen uns regelmäßig zum Austausch über Coding, Tech und
								mehr! Die Termine werden in der Signal-Gruppe angekündigt. Wir
								würden uns sehr freuen, dich bald persönlich kennenzulernen!
							</Text>
						</Section>

						<Hr className="border-t border-gray-200 my-[32px]" />

						<Text className="text-[16px] leading-[24px] text-gray-700 mb-[16px]">
							Bis bald bei Neuland!
						</Text>

						<Text className="text-[16px] leading-[24px] text-gray-700 mb-[8px]">
							Viele Grüße
						</Text>

						<Text className="text-[16px] leading-[24px] text-blue-500 font-bold m-0">
							Felix, Nico und Ronja
						</Text>

						<Section className="mt-[12px]">
							<Hr className="border-t border-gray-200 my-[32px]" />

							<Section className="bg-gray-100 p-[24px] rounded-[8px] border border-gray-200">
								<Row>
									<Column>
										<Img
											src="https://neuland-ingolstadt.de/favicon.svg"
											alt="Neuland Logo"
											width="80"
											height="auto"
											className="w-[80px] h-auto mb-[16px]"
										/>

										<Text className="text-[16px] leading-[24px] text-gray-700 font-bold m-0 mb-[8px]">
											Neuland Ingolstadt e.V.
										</Text>

										<Text className="text-[14px] leading-[22px] text-gray-600 m-0">
											Esplanade 10
										</Text>
										<Text className="text-[14px] leading-[22px] text-gray-600 m-0 mb-[16px]">
											85049 Ingolstadt
										</Text>

										<Text className="text-[14px] leading-[22px] text-gray-600 m-0">
											<Link
												href="mailto:info@neuland-ingolstadt.de"
												className="text-blue-500 no-underline hover:underline"
											>
												info@neuland-ingolstadt.de
											</Link>
										</Text>

										<Hr className="border-t border-gray-200 my-[16px]" />

										<Text className="text-[14px] leading-[22px] text-gray-600 m-0">
											<span className="text-gray-500">Vorstände:</span> Felix
											Weber, Nico Märtin, Ronja Meitz
										</Text>

										<Text className="text-[14px] leading-[22px] text-gray-600 m-0">
											<span className="text-gray-500">Registergericht:</span>{" "}
											Amtsgericht Ingolstadt
										</Text>
										<Text className="text-[14px] leading-[22px] text-gray-600 m-0">
											<span className="text-gray-500">Registernummer:</span> VR
											201088
										</Text>
									</Column>
								</Row>
							</Section>
						</Section>
					</Container>

					<Container className="max-w-[600px] mx-auto mt-[32px] text-center">
						<Text className="text-[14px] text-gray-500 m-0">
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
