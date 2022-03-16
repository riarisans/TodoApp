import express, { request } from "express";
import bodyParser from "body-parser";
import { Db, MongoClient } from "mongodb";
import { config } from "dotenv";
import rateLimit from "express-rate-limit";

config();

const app = express();
let db: Db;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
    rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 50,
    })
);
app.set("view engine", "ejs");
MongoClient.connect(
    `mongodb+srv://${process.env.DB_ID}:${process.env.DB_PASSWORD}@${process.env.DB_DOMAIN}/${process.env.DB_NAME}?retryWrites=true&w=majority`,
    (error, client) => {
        if (error) {
            return console.log(error.message);
        }

        db = client!.db("TodoApp");

        let server = app.listen(8080, () => {
            let address = server.address();
            console.log(
                `서버가 열렸습니다! (${JSON.stringify(server.address())})`
            );
        });

        app.get("/", (req, res) => {
            res.sendFile(`${__dirname}/public/index.html`);
        });

        app.get("/write", (req, res) => {
            res.sendFile(`${__dirname}/public/write.html`);
        });

        app.post("/add", (req, res) => {
            db.collection("counter").findOne(
                { name: "postCount" },
                (error, result) => {
                    db.collection("post").insertOne(
                        {
                            _id: result?.totalPost,
                            title: req.body?.title,
                            DateTime: new Date().toLocaleString(),
                            hasCleared: false,
                        },
                        (error, result) => {
                            if (error)
                                console.log(
                                    `[${req.ip}] 글 추가 처리중 에러발생 ${error.message}`
                                );
                            else {
                                console.log(
                                    `[${req.ip}] 글 추가 ${req.body?.title}`
                                );
                                db.collection("counter").updateOne(
                                    { name: "postCount" },
                                    { $inc: { totalPost: 1 } }
                                );
                            }
                        }
                    );
                }
            );
            setTimeout(() => {
                res.redirect("./list");
            }, 100);
        });

        app.get("/list", (req, res) => {
            db.collection("post")
                .find()
                .toArray((error, result) => {
                    if (error) {
                        console.log(error);
                    }
                    res.render("list.ejs", { posts: result });
                });
        });

        app.delete("/delete", (req, res) => {
            req.body._id = Number(req.body._id);
            console.log(`[${req.ip}] 글 삭제 로그 ${JSON.stringify(req.body)}`);
            db.collection("post").findOne(
                { _id: req.body._id },
                (error, result) => {
                    if (error)
                        return res.status(400).send("에러가 발생했습니다");
                    else if (!result)
                        return res.status(400).send("이미 삭제된 글입니다.");
                    else {
                        db.collection("post").deleteOne(
                            req.body,
                            (error, result) => {
                                if (error) {
                                    return res.status(400).send(error.message);
                                }
                                return res
                                    .status(200)
                                    .send("글 삭제에 성공했습니다.");
                            }
                        );
                    }
                }
            );
        });
    }
);
