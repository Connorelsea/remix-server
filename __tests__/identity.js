import { graphql } from "graphql";
import schema from "../schema";
import { db } from "../connectors";

async function makeQuery(query, vars, context) {
  return graphql({
    source: query,
    contextValue: context || {},
    rootValue: {},
    schema,
    variableValues: vars
  });
}

test("getUsers should return meta info on users in given id array", async () => {
  const getUsersSource = `
    query getUsers(
      $users: [ID!]!
    ) {
      getUsers(
        users: $users
      ) {
        id
        name
        username
      }
    }
  `;

  const getUsersResult = await makeQuery(getUsersSource, { users: ["1", "2"] });

  expect(getUsersResult).toBeDefined();
  expect(getUsersResult.data.getUsers).toHaveLength(2);
  expect(getUsersResult.data.getUsers[0].username).toBe("testuserman");
  expect(getUsersResult.data.getUsers[1].username).toBe("womantestuser");
});
