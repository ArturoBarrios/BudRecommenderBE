// src/index.ts
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { readFileSync } from "fs";
import gql from "graphql-tag";
import { buildSubgraphSchema } from "@apollo/subgraph";

// src/routes/strains.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";

// src/services/recommendStrains.js
import { OpenAI } from "openai";

// src/services/vectorSearch.js
import fs from "fs";
function cosineSim(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}
function getTopMatches(queryEmbedding, k = 5) {
  const embeddedStrains = JSON.parse(fs.readFileSync("./embeddedStrains.json", "utf-8"));
  const scored = embeddedStrains.map((strain) => ({
    ...strain,
    similarity: cosineSim(queryEmbedding, strain.embedding)
  }));
  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, k);
}

// src/services/recommendStrains.js
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function recommendStrains(userQuery) {
  console.log("\u{1F916} Starting recommendation process...");
  console.log(`\u{1F4DD} User query: "${userQuery}"`);
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: userQuery
  });
  console.log("\u{1F9E0} Embedding generated.");
  const queryEmbedding = embeddingRes.data[0].embedding;
  const topStrains = getTopMatches(queryEmbedding, 5);
  console.log("\u{1F33F} Top matching strains:");
  topStrains.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} - ${s.strainType}, ${s.thc}% THC, ${s.weight}, ${s.price}`);
  });
  const prompt = `
A user wants cannabis for: "${userQuery}".
Here are some strains that might match:

${topStrains.map(
    (s, i) => `${i + 1}. ${s.name} - ${s.strainType}, ${s.thc}% THC, ${s.weight}, ${s.price}`
  ).join("\n")}

Choose the best 3 and explain why.
Format as:
[
  { "name": "Strain", "reason": "..." },
  ...
]
`;
  console.log("\u270D\uFE0F Sending prompt to OpenAI:");
  console.log(prompt);
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });
  console.log("\u{1F4E9} Response received from OpenAI:");
  console.log(response.choices[0].message.content);
  return response.choices[0].message.content;
}

// src/services/embedStrains.js
import { OpenAI as OpenAI2 } from "openai";
import fs2 from "fs";
var openai2 = new OpenAI2({ apiKey: process.env.OPENAI_API_KEY });
async function embedStrainsFromAPI() {
  const res = await fetch("http://localhost:4000/strains/get-strains");
  const strains = await res.json();
  const embedded = [];
  for (const strain of strains) {
    const text = `${strain.name}, ${strain.strainType}, ${strain.thc}% THC, ${strain.weight}, ${strain.price}`;
    const embeddingRes = await openai2.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    embedded.push({
      ...strain,
      embedding: embeddingRes.data[0].embedding
    });
    await new Promise((r) => setTimeout(r, 100));
  }
  fs2.writeFileSync("./embeddedStrains.json", JSON.stringify(embedded, null, 2));
  console.log("\u2705 Embedding complete. Saved to embeddedStrains.json");
}

// src/routes/strains.js
var prisma = new PrismaClient();
var router = Router();
router.get("/embed-strains", async (req, res) => {
  try {
    console.log("\u{1F4E6} Embedding strains from API...");
    await embedStrainsFromAPI();
    console.log("\u2705 Embedding completed.");
    res.json({ success: true, message: "Strains embedded and saved." });
  } catch (err) {
    console.error("\u274C Error during embedding:", err);
    res.status(500).json({ success: false, error: "Embedding failed" });
  }
});
router.post("/create-strains", async (req, res) => {
  const { storeName, strains } = req.body;
  console.log(`\u{1F4E5} Creating strains for store: ${storeName}`);
  try {
    let store = await prisma.store.findFirst({ where: { name: storeName } });
    if (!store) {
      console.log("\u{1F3EA} Store not found, creating new store");
      store = await prisma.store.create({ data: { name: storeName } });
    }
    const createdStrains = [];
    for (const s of strains) {
      console.log(`\u{1F33F} Creating strain: ${s.name}`);
      if (!s.brand || typeof s.brand !== "string") {
        throw new Error(`Missing or invalid brand for strain: ${s.name}`);
      }
      const brandName = s.brand.trim();
      let brand = await prisma.brand.findUnique({ where: { name: brandName } });
      if (!brand) {
        console.log("\u{1F3F7}\uFE0F Creating new brand:", brandName);
        brand = await prisma.brand.create({
          data: { name: brandName }
        });
      }
      let strain = await prisma.strain.findUnique({ where: { name: s.name } });
      if (!strain) {
        strain = await prisma.strain.create({
          data: {
            name: s.name,
            url: s.url,
            thc: parseFloat(s.thc),
            weight: Array.isArray(s.weight) ? s.weight : [s.weight],
            price: Array.isArray(s.price) ? s.price : [s.price],
            strainType: s.strain_type,
            brand: {
              connect: { id: brand.id }
            }
          }
        });
      }
      await prisma.strainStore.create({
        data: {
          strainId: strain.id,
          storeId: store.id,
          offer: s.offer || null
        }
      });
      for (const [terpeneName, raw] of Object.entries(s.terpenes ?? {})) {
        console.log(`\u{1F9EA} Processing terpene: ${terpeneName}`);
        let terpene = await prisma.terpene.findUnique({ where: { name: terpeneName } });
        if (!terpene) {
          console.log("\u{1F195} Creating new terpene:", terpeneName);
          terpene = await prisma.terpene.create({
            data: {
              name: terpeneName,
              description: ""
            }
          });
        }
        const clean = raw.toLowerCase().replace("%", "").replace("mg/g", "").trim();
        const isMg = raw.toLowerCase().includes("mg/g");
        const percentage = parseFloat(clean);
        await prisma.strainTerpene.create({
          data: {
            strainId: strain.id,
            terpeneId: terpene.id,
            percentage: isMg ? percentage / 10 : percentage
          }
        });
      }
      createdStrains.push(strain);
    }
    console.log(`\u2705 Created ${createdStrains.length} strains.`);
    res.status(201).json({ success: true, strains: createdStrains });
  } catch (err) {
    console.error("\u274C Error creating strains:", err);
    res.status(500).json({ success: false, error: "Failed to create strains" });
  }
});
router.post("/recommend", async (req, res) => {
  try {
    const { strainType, thcTier, priceTier, weight, mood, text } = req.body;
    const parts = [];
    if (strainType) parts.push(`a ${strainType}`);
    if (thcTier) {
      if (thcTier === "low") parts.push("low THC");
      else if (thcTier === "mid") parts.push("moderate THC");
      else if (thcTier === "high") parts.push("high THC");
    }
    if (priceTier) {
      if (priceTier === "low") parts.push("under $30");
      else if (priceTier === "mid") parts.push("around $30-$60");
      else if (priceTier === "high") parts.push("premium pricing");
    }
    if (weight) parts.push(`weighing around ${weight}`);
    if (mood) parts.push(`for a ${mood} mood`);
    if (text) parts.push(text);
    const userQuery = `I'm looking for ${parts.join(", ")}`;
    console.log(`\u{1F916} Recommending strains for query: "${userQuery}"`);
    const recommendations = await recommendStrains(userQuery);
    res.json({
      success: true,
      recommendations
    });
  } catch (err) {
    console.error("\u274C Error recommending strains:", err);
    res.status(500).json({ success: false, error: "Failed to fetch recommendations" });
  }
});
router.get("/get-strains", async (req, res) => {
  try {
    console.log("\u{1F4E1} Fetching strains from database...");
    const strains = await prisma.strain.findMany({
      include: {
        brand: {
          select: { id: true, name: true }
        },
        strainTerpenes: {
          include: {
            terpene: {
              select: { id: true, name: true, description: true }
            }
          }
        },
        strainStores: {
          include: {
            store: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
    const formatted = strains.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      thc: s.thc,
      weight: s.weight,
      price: s.price,
      strainType: s.strainType,
      brand: s.brand,
      terpenes: s.strainTerpenes.map((st) => ({
        id: st.terpene.id,
        name: st.terpene.name,
        description: st.terpene.description,
        percentage: st.percentage
      })),
      stores: s.strainStores.map((ss) => ({
        id: ss.store.id,
        name: ss.store.name,
        offer: ss.offer
      }))
    }));
    console.log(`\u2705 Returned ${formatted.length} strains.`);
    res.json(formatted);
  } catch (err) {
    console.error("\u274C Error fetching strains:", err);
    res.status(500).json({ success: false, error: "Failed to fetch strains" });
  }
});
var strains_default = router;

// src/resolvers/resolvers.ts
import { PrismaClient as PrismaClient2 } from "@prisma/client";
import bcrypt from "bcrypt";
var prisma2 = new PrismaClient2();
var resolvers = {
  Query: {
    getStrains: async () => {
      return await prisma2.strain.findMany({
        include: {
          stores: true,
          strainTerpenes: {
            include: {
              terpene: true
            }
          }
        },
        orderBy: {}
      });
    }
  },
  Mutation: {
    createStore: async (_, args) => {
      return await prisma2.store.create({
        data: { name: args.name }
      });
    },
    signup: async (_, args) => {
      const existing = await prisma2.user.findUnique({ where: { email: args.email } });
      if (existing) {
        throw new Error("Email already in use.");
      }
      const hashedPassword = await bcrypt.hash(args.password, 10);
      return await prisma2.user.create({
        data: {
          email: args.email,
          password: hashedPassword
        }
      });
    },
    login: async (_, args) => {
      const user = await prisma2.user.findUnique({ where: { email: args.email } });
      if (!user) {
        throw new Error("Invalid email or password.");
      }
      const isValid = await bcrypt.compare(args.password, user.password);
      if (!isValid) {
        throw new Error("Invalid email or password.");
      }
      return user;
    },
    createStrain: async (_, args) => {
      const strain = await prisma2.strain.create({
        data: {
          name: args.name,
          url: args.url,
          thc: args.thc,
          weight: args.weight,
          price: args.price,
          strainType: args.strainType,
          stores: {
            connect: args.storeIds.map((id) => ({ id }))
          }
        }
      });
      for (let i = 0; i < args.terpeneNames.length; i++) {
        const name = args.terpeneNames[i];
        const percentage = args.terpenePercentages[i];
        let terpene = await prisma2.terpene.findUnique({ where: { name } });
        if (!terpene) {
          terpene = await prisma2.terpene.create({
            data: {
              name,
              description: ""
              // Optional placeholder
            }
          });
        }
        await prisma2.strainTerpene.create({
          data: {
            strainId: strain.id,
            terpeneId: terpene.id,
            percentage
          }
        });
      }
      return await prisma2.strain.findUnique({
        where: { id: strain.id },
        include: {
          stores: true,
          strainTerpenes: {
            include: {
              terpene: true
            }
          }
        }
      });
    }
  }
};

// src/routes/userAuth.js
import { Router as Router2 } from "express";
var router2 = Router2();
router2.post("/signup", async (req, res) => {
  console.log("\u{1F510} User signup attempt:", req.body);
  const { email, password } = req.body;
  try {
    const user = await resolvers.Mutation.signup(null, { email, password });
    console.log("\u2705 User signed up successfully:", user.email);
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name || null
    };
    req.session.save(() => {
      res.status(201).json({ success: true, user: req.session.user });
    });
  } catch (err) {
    console.error("\u274C Signup error:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});
router2.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await resolvers.Mutation.login(null, { email, password });
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name || null
    };
    req.session.save(() => {
      res.status(200).json({ success: true, user: req.session.user });
    });
  } catch (err) {
    console.error("\u274C Login error:", err.message);
    res.status(401).json({ success: false, error: err.message });
  }
});
router2.get("/me", (req, res) => {
  console.log("\u{1F9EA} SESSION on /auth/me:", req.session);
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.status(401).json({ success: false, error: "Not authenticated" });
  }
});
router2.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ success: true });
  });
});
var userAuth_default = router2;

// src/index.ts
import session from "express-session";
dotenv.config();
var app = express();
var PORT = 4e3;
app.use(cors({
  origin: "http://localhost:3000",
  // adjust if Nuxt is hosted elsewhere
  credentials: true
}));
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "your-super-secret-with-32-chars",
    resave: true,
    // <--- force session save on every response
    saveUninitialized: true,
    // <--- create session even if nothing set yet
    cookie: {
      httpOnly: true,
      secure: false,
      // true in production w/ HTTPS
      maxAge: 1e3 * 60 * 60 * 24
      // 1 day
    }
  })
);
app.use(express.json());
app.use("/strains", strains_default);
app.use("/auth", userAuth_default);
var typeDefs = gql(readFileSync(new URL("./schema.graphql", import.meta.url), "utf8"));
var server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers })
});
await server.start();
app.use("/graphql", expressMiddleware(server, {
  context: async ({ req, res }) => ({ req, res })
}));
app.listen(PORT, () => {
  console.log(`\u{1F680} GraphQL server ready at http://localhost:${PORT}/graphql`);
  console.log(`\u{1F4E6} Strains routes ready`);
});
//# sourceMappingURL=index.js.map