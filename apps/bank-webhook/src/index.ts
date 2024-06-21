import express from "express";
import db from "@repo/db/client";
import { z } from "zod";

const app = express();
const bodyParser = require("body-parser");

const paymentInformationSchema = z.object({
	token: z.string(),
	userId: z.number(),
	amount: z.string(),
});

app.use(bodyParser.json());

app.post("/hdfcWebhook", async (req, res) => {
	const paymentInformation: {
		token: string;
		userId: number;
		amount: string;
	} = {
		token: req.body.token,
		userId: req.body.user_identifier,
		amount: req.body.amount,
	};
	const validation = paymentInformationSchema.safeParse(paymentInformation);
	if (!validation.success) {
		console.error("Invalid information:", validation.error.format());
		return null;
	}
	try {
		await db.$transaction([
			db.balance.updateMany({
				where: {
					userId: Number(paymentInformation.userId),
				},
				data: {
					amount: {
						increment: Number(paymentInformation.amount),
					},
				},
			}),
			db.onRampTransaction.updateMany({
				where: {
					token: paymentInformation.token,
				},
				data: {
					status: "Success",
				},
			}),
		]);

		res.json({
			message: "Captured",
		});
	} catch (e) {
		console.error(e);
		res.status(411).json({
			message: "Error while processing webhook",
		});
	}
});

app.listen(3003);
