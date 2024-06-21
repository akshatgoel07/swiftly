import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { z } from "zod";

interface UserCredentials {
	phone: string;
	password: string;
}

const CredentialsSchema = z.object({
	phone: z.string().min(10).max(10),
	password: z.string().min(6),
});

export const authOptions = {
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				phone: {
					label: "Phone number",
					type: "text",
					placeholder: "8899008899",
					required: true,
				},
				password: {
					label: "Password",
					type: "password",
					required: true,
				},
			},

			async authorize(
				credentials: UserCredentials | any,
			): Promise<UserCredentials | any> {
				const validation = CredentialsSchema.safeParse(credentials);
				if (!validation.success) {
					console.error(
						"Invalid credentials:",
						validation.error.format(),
					);
					return null;
				}
				const hashedPassword = await bcrypt.hash(
					credentials.password,
					10,
				);
				const existingUser = await db.user.findFirst({
					where: {
						number: credentials.phone,
					},
				});

				if (existingUser) {
					const passwordValidation = await bcrypt.compare(
						credentials.password,
						existingUser.password,
					);
					if (passwordValidation) {
						return {
							id: existingUser.id.toString(),
							name: existingUser.name,
							email: existingUser.number,
						};
					}
					return null;
				}

				try {
					const user = await db.user.create({
						data: {
							number: credentials.phone,
							password: hashedPassword,
						},
					});

					return {
						id: user.id.toString(),
						name: user.name,
						email: user.number,
					};
				} catch (e) {
					console.error(e);
				}

				return null;
			},
		}),
	],
	secret: process.env.JWT_SECRET || "secret",
	callbacks: {
		async session({ token, session }: any) {
			session.user.id = token.sub;

			return session;
		},
	},
};
