import { Collection, ObjectId } from "mongodb";
import { APIPhone, APITime, ContactModel } from "./types.ts";
import { GraphQLError } from "gql";

type getContactQueryArgs = {
	id: string;
};

type addContactQueryArgs = {
	name: string;
	phone: string;
};

type deleteContactMutationArgs = {
	id: string;
};

type Context = {
	contactCollection: Collection<ContactModel>;
};

export const resolvers = {
	Query: {
		getContact: async (_: unknown, args: getContactQueryArgs, ctx: Context): Promise<ContactModel | null> => {
			return await ctx.contactCollection.findOne({ _id: new ObjectId(args.id) });
		},
		getContacts: async (_: unknown, __: unknown, ctx: Context): Promise<ContactModel[]> => {
			return await ctx.contactCollection.find().toArray();
		},
	},
	Mutation: {
		addContact: async (_: unknown, args: addContactQueryArgs, ctx: Context): Promise<ContactModel> => {
			const { name, phone } = args;
			const phoneExists = await ctx.contactCollection.countDocuments({ phone });
			if (phoneExists >= 1) throw new GraphQLError("Phone already exists in DB");

			const url = `https://api.api-ninjas.com/v1/validatephone?number=${phone}`;
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
				throw new GraphQLError("Error in Ninja's API request");
			}
			const response: APIPhone = await data.json();
			if (!response.is_valid) {
				throw new GraphQLError("Invalid phone number");
			}
			const country = response.country;
			const timezone = response.timezones[0];

			const { insertedId } = await ctx.contactCollection.insertOne({ name, phone, timezone, country });
			const newContact: ContactModel = {
				_id: insertedId,
				name,
				phone,
				timezone,
				country,
			};
			return newContact;
		},
		deleteContact: async (_: unknown, args: deleteContactMutationArgs, ctx: Context): Promise<Boolean> => {
			const { deletedCount } = await ctx.contactCollection.deleteOne({ _id: new ObjectId(args.id) });
			return deletedCount === 1;
		},
	},
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
