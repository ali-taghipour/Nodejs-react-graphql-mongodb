const {buildSchema} = require("graphql");

/* this below module is for mutation(post,delete,put) */
module.exports = buildSchema(`
    type Post{
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type User{
        _id: ID!
        email: String!
        name: String!
        password: String
        status: String!
        posts: [Post!]!
    }

    type AuthData{
        userId: String!,
        token: String!
    }

    input PostInputData{
        title: String!
        content: String!
        imageUrl: String!
    }

    type PostData{
        posts: [Post!]!
        totalPosts: Int!
    }

    input UserInputData{
        email: String!
        name: String!
        password: String!
    }

    type RootMutation{
        createUser(userInput: UserInputData): User!
        createPost(postInput: PostInputData): Post!
        updatePost(id:ID!, postInput: PostInputData): Post!
        deletePost(id:ID!): Boolean 
        updateStatus(status:String!): User!
    }

    type RootQuery{
        login(email: String!, password: String!): AuthData!
        posts(page:Int): PostData!
        user: User!
        post(id:ID!): Post!
    }

    schema{
        query: RootQuery
        mutation: RootMutation
    }
`)


/* this below module is for get has query paramater */
// module.exports = buildSchema(`
//     type TestData{
//         name: String!
//         age: Int!
//     }

//     type RootQuery{
//         info: TestData!
//     }

//     schema{
//         query: RootQuery
//     }
// `)
