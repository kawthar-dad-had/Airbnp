const { MongoClient } = require('mongodb');
var express = require("express")
const cors = require('cors'); 
var app = express()
app.use(cors());
app.use(express.json())

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const secretKey = 'kawthar';

const uri = 'mongodb://localhost:27017'; 
const client = new MongoClient(uri);


function generateToken(user) {
  const payload = {
      userId: user._id,
      mail: user.mail
  };
  
  const options = {
      expiresIn: '1h' // Le jeton expirera dans 1 heure (vous pouvez ajuster cela selon vos besoins)
  };
  
  // Génération du jeton
  const token = jwt.sign(payload, secretKey, options);
  return token;
}


app.post("/register", async (req, res) => {
  try {
      const { mail, prenom, nom, telephone, password } = req.body;
      if (!mail || !prenom || !nom || !telephone || !password) {
          return res.status(400).json({ error: "All fields are required" });
      }
      
      // Hacher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10); // Utilisation de 10 comme coût de hachage
      
      // Insérer l'utilisateur dans la base de données avec le mot de passe haché
      await client.connect();
      const database = client.db('airbnp');
      await database.collection('Users').insertOne({
          mail,
          prenom,
          nom,
          telephone,
          password: hashedPassword // Stocker le mot de passe haché dans la base de données
      });
      
      res.json("User Registered");
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/login", async (req, res) => {
  try {
      const { mail, password } = req.body;
      console.log(mail,password)
      if (!mail || !password) {
          return res.status(400).json({ error: "Email and password are required" });
      }
      
      // Récupérer l'utilisateur depuis la base de données
      const database = client.db('airbnp');
      const user = await database.collection('Users').findOne({ mail });
      console.log(user)
      if (!user) {
          return res.status(401).json({ error: "Invalid email or password" });
      }
      
      // Vérifier le mot de passe haché
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log(isPasswordValid)
      if (!isPasswordValid) {
          return res.status(401).json({ error: "Invalid email or password" });
      }

      // Générer un jeton JWT pour l'utilisateur
      const token = generateToken(user);

      // Renvoyer le jeton au client
      res.json({ token });
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


app.post("/user", async (req, res) => {
    await client.connect();
    const database = client.db('airbnp');
    await database.collection('Users').insertOne({
        mail: req.body.mail,
        prenom: req.body.prenom,
        nom: req.body.nom,
        telephone: req.body.telephone
      });
    res.json("User Added")
  })



app.get("/user", async (req, res) => {
    await client.connect();
    const database = client.db('airbnp');
    let users = await database.collection('Users').find().toArray()
    res.json(users)
  })

  app.delete("/user/:mail", async (req, res) => {
    try {
      await client.connect();
      const database = client.db('airbnp');
      console.log(req.params.mail)
      const result = await database.collection('Users').deleteOne({ mail: req.params.mail });
      if (result.deletedCount === 1) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
app.post("/bien", async (req, res) => {
  await client.connect();
  const database = client.db('airbnp');
  await database.collection('Biens').insertOne({
    userId: req.body.userId,
    commune: req.body.commune,
    rue: req.body.rue,
    cp: req.body.cp,
    nbCouchages: req.body.nbCouchages,
    nbChambres: req.body.nbChambres,
    distance: req.body.distance,
    prix: req.body.prix,
    dateDebut: req.body.dateDebut,
    dateFin: req.body.dateFin,
    latitude: req.body.latitude,
    longitude: req.body.longitude
    });
  res.json("Bien Added")
})


app.get("/biens/filtre", async (req, res) => {
  try {
      const { dateDebut, dateFin, commune, prixMax, nbChambresMin, nbCouchagesMin, distanceMax } = req.query;
      console.log(dateDebut, dateFin, commune, prixMax, nbChambresMin, nbCouchagesMin, distanceMax)
      const filter = {};

      // Filtrer par date de début et de fin
      if (dateDebut && dateFin) {
          filter.dateDebut = { $lte: new Date(dateDebut) };
          filter.dateFin = { $gte: new Date(dateFin) };
      }

      // Filtrer par commune
      if (commune) {
          filter.commune = commune;
      }

      // Filtrer par prix maximum
      if (prixMax) {
          filter.prix = { $lte: parseInt(prixMax) };
      }

      // Filtrer par nombre de chambres minimum
      if (nbChambresMin) {
          filter.nbChambres = { $gte: parseInt(nbChambresMin) };
      }

      // Filtrer par nombre de couchages minimum
      if (nbCouchagesMin) {
          filter.nbCouchages = { $gte: parseInt(nbCouchagesMin) };
      }

      // Filtrer par distance maximum
      if (distanceMax) {
          filter.distance = { $lte: parseInt(distanceMax) };
      }

      // Connectez-vous à la base de données et exécutez la requête
      await client.connect();
      const database = client.db('airbnp');
      console.log(filter)
      const biens = await database.collection('Biens').find({commune, prix: { '$lte': parseInt(prixMax) } , dateDebut: { '$lte': dateDebut } , dateFin: { '$gte': dateFin } , nbChambres: { '$gte': parseInt(nbChambresMin) },nbCouchages: { '$gte': parseInt(nbCouchagesMin) }, distance: { '$lte': parseInt(distanceMax) }}).toArray();

      res.json(biens);
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/bien", async (req, res) => {
  await client.connect();
  const database = client.db('airbnp');
  let biens = await database.collection('Biens').find().toArray()
  res.json(biens)
})


// app.delete("/bien/:commune", async (req, res) => {
//   try {
//     await client.connect();
//     const database = client.db('airbnp');
//     const result = await database.collection('Biens').deleteOne({ _id: req.params.id });
//     if (result.deletedCount === 1) {
//       res.json({ message: "Property deleted successfully" });
//     } else {
//       res.status(404).json({ error: "Property not found" });
//     }
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });


app.get("/bien/user", async (req, res) => {
    try {
        await client.connect();
        const database = client.db('airbnp');
        
        // Récupérer tous les biens avec les informations de l'utilisateur associé
        let biens = await database.collection('Biens').aggregate([
            {
                $lookup: {
                    from: "Users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: "$user"
            },
            {
                $match: {
                    "user._id": req.body.userId
                }
            }
        ]).toArray();

        res.json(biens);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.delete("/users/all", async (req, res) => {
  try {
      await client.connect();
      const database = client.db('airbnp');
      const result = await database.collection('Users').deleteMany({});
      res.json({ message: "All users deleted successfully" });
  } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
  }
});


app.delete("/biens/all", async (req, res) => {
  try {
      await client.connect();
      const database = client.db('airbnp');
      const result = await database.collection('Biens').deleteMany({});
      res.json({ message: "All properties deleted successfully" });
  } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
  }
});



app.post("/location", async (req, res) => {
  try {
    const { idBien, mailLoueur,commune,prix ,dateDebut, dateFin, avis } = req.body;
    if (!idBien || !mailLoueur || !commune || !prix || !dateDebut || !dateFin || !avis) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Connectez-vous à la base de données et insérez la location
    await client.connect();
    const database = client.db('airbnp');
    await database.collection('Locations').insertOne({
      idBien,
      mailLoueur,
      commune,
      prix,
      dateDebut,
      dateFin,
      avis
    });

    res.json("Location Added");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/location", async (req, res) => {
  try {
    // Connectez-vous à la base de données et récupérez toutes les locations
    await client.connect();
    const database = client.db('airbnp');
    let locations = await database.collection('Locations').find().toArray();
    res.json(locations);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/location/:mail", async (req, res) => {
  try {
    // Connectez-vous à la base de données et récupérez toutes les locations
    await client.connect();
    const database = client.db('airbnp');
    let locations = await database.collection('Locations').find({mailLoueur : req.params.mail}).toArray();
    res.json(locations);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.listen(8888 , () => {
  console.log("server started")
})
