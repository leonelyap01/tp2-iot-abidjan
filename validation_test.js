/**
 * TP2 — MongoDB IoT — M1 BDGL
 * UFHB — 2024-2025
 * Auteur : Leonel YAPI
 *
 * Test de la validation JSON Schema stricte de la collection "devices".
 * On tente d'inserer un document deliberement invalide. La validation doit le rejeter.
 *
 * Exécution (PowerShell ou Bash) :
 *   Get-Content validation_test.js | docker exec -i mongodb mongosh --quiet "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin"
 */

db = db.getSiblingDB('iot_abidjan');

print("======================================================");
print(" Test de la validation JSON Schema — collection devices");
print("======================================================\n");

// Document deliberement INVALIDE :
//   - commune = 'paris'        => hors enum [cocody, yopougon, plateau, marcory, adjame]
//   - location absente         => champ requis
//   - createdAt absent         => champ requis
const docInvalide = {
  device_id: "BAD_001",
  commune: "paris",
  sensors: ["DHT22"]
};

print("Document tente :");
printjson(docInvalide);
print("");

try {
  db.devices.insertOne(docInvalide);
  print("ECHEC DU TEST : le document a ete ACCEPTE alors qu'il aurait du etre REJETE.");
} catch (e) {
  // mongosh 2.x emballe l'erreur dans un MongoBulkWriteError.
  // On extrait le codeName quel que soit le niveau ou il se trouve.
  const errResp = e.errorResponse || (e.writeErrors && e.writeErrors[0] && e.writeErrors[0].err) || {};
  const code     = errResp.code     || e.code;
  const codeName = errResp.codeName || e.codeName
                   || (code === 121 ? 'DocumentValidationFailure' : 'Unknown');
  const errmsg   = errResp.errmsg   || e.message;

  print("OK — document REJETE par la validation");
  print("  code     : " + code + "  (= DocumentValidationFailure)");
  print("  codeName : " + codeName);
  print("  motif    : " + String(errmsg).split('\n')[0]);
}

print("");
print("(Verification : nb de devices toujours = " + db.devices.countDocuments() + ")");
