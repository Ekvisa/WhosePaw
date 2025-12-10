import jsonServer from "json-server";
import path from "path";

const server = jsonServer.create();
const router = jsonServer.router(path.join("db.json"));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);
server.use("/api", router);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`JSON Server is running on port ${PORT}`);
});
