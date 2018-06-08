import { graphql } from "graphql";
import { schema } from "../schema";
import { db } from "../connectors";

async function makeQuery(query, vars, context) {
  return graphql({
    source: query,
    contextValue: context || {},
    rootValue: {},
    schema,
    variableValues: vars,
  });
}

test("getUsersById should return metadata for given user IDs", async () => {
  const getUsersSource = `
    query getUsersById(
      $userIdentifiers: [ID]
    ) {
      getUsersById(
        userIdentifiers: $userIdentifiers
      ) {
        id
        name
        username
      }
    }
  `;

  const getUsersResult = await makeQuery(getUsersSource, {
    userIdentifiers: ["1", "2"],
  });

  expect(getUsersResult).toBeDefined();
  expect(getUsersResult.data.getUsersById).toHaveLength(2);
  expect(getUsersResult.data.getUsersById[0].username).toBe("testuserman");
  expect(getUsersResult.data.getUsersById[1].username).toBe("womantestuser");
});

test("getUsersByName should return metadata for given usernames", async () => {
  const getUsersSource = `
  query getUsersByName(
    $userIdentifiers: [String]
  ) {
    getUsersByName(
      userIdentifiers: $userIdentifiers
    ) {
      id
      name
      username
    }
  }
`;

  const getUsersResult = await makeQuery(getUsersSource, {
    userIdentifiers: ["testuserman", "womantestuser"],
  });

  expect(getUsersResult).toBeDefined();
  expect(getUsersResult.data.getUsersByName).toHaveLength(2);
  expect(getUsersResult.data.getUsersByName[0].id).toBe("1");
  expect(getUsersResult.data.getUsersByName[1].id).toBe("2");
});
