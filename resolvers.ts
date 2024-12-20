import { Collection, ObjectId } from "mongodb";
import { APITime, ContactModel } from "./types.ts";
import { GraphQLError } from "gql";

type getContactArgs = {
	id: string;
};

type Context = {
	contactCollection: Collection<ContactModel>;
};

export const resolvers = {
	Query: {
		getContact: async (_: unknown, args: getContactArgs, ctx: Context): Promise<ContactModel | null> => {
			return await ctx.contactCollection.findOne({ _id: new ObjectId(args.id) });
		},
		getContacts: async (_: unknown, __: unknown, ctx: Context): Promise<ContactModel[]> => {
			return await ctx.contactCollection.find().toArray();
		},
	},
	Mutation: {},
	Contact: {
		id: (parent: ContactModel) => {
			return parent._id!.toString();
		},
		time: async (parent: ContactModel): Promise<string> => {
			const timezone = parent.timezone;
			const url = `https://api.api-ninjas.com/v1/worldtime?timezone=${timezone}`;
			const API_KEY = Deno.env.get("API_KEY");
			if (!API_KEY) {
				throw new GraphQLError("No API_KEY value for Ninja API's request");
			}
			const data: Response = await fetch(url, {
				headers: {
					"X-Api-Key": API_KEY,
				},
			});
			if (data.status !== 200) {
				throw new GraphQLError("API Ninjas's request error");
			}
			const response: APITime = await data.json();
			return response.datetime;
		},
	},
};
