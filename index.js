import koa from "koa" // koa@2
import koaRouter from "koa-router" // koa-router@next
import koaBody from "koa-bodyparser" // koa-bodyparser@next
import { graphqlKoa, graphiqlKoa } from "apollo-server-koa"

const app = new koa()
const router = new koaRouter()
const PORT = 3000

// koaBody is needed just for POST.
router.post("/graphql", koaBody(), graphqlKoa({ schema: myGraphQLSchema }))
router.get("/graphql", graphqlKoa({ schema: myGraphQLSchema }))

router.get("/graphiql", graphiqlKoa({ endpointURL: "/graphql" }))

app.use(router.routes())
app.use(router.allowedMethods())
app.listen(PORT)
