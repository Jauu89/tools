// Datos de la galería. Orden de grupos: de comestibles a no comestibles.
// Los "se confunde con" se cruzan solos: si A aparece con B en PARES, ambos se enlazan entre sí.

window.GROUPS = [
  { id: "excelente", tone: "ok", label: "Comestibles excelentes",
    note: "Carne inmutable: no cambia de color al cortarla. Son los boletus que buscas." },
  { id: "precaucion", tone: "warn", label: "Comestibles con precauciones",
    note: "Azulean al cortarlos o tocarlos. Solo bien cocinados y solo si estás seguro de la especie." },
  { id: "nocomestible", tone: "bad", label: "No comestibles",
    note: "Amargos o sin valor. No son graves, pero estropean un guiso entero." },
  { id: "toxico", tone: "danger", label: "Tóxicos",
    note: "Provocan intoxicación. No los recojas." }
];

window.SPECIES = [
  // ---------- Comestibles excelentes ----------
  { id: "edulis", group: "excelente", sci: "Boletus edulis", es: "Boleto comestible",
    imgs: [
      { f: "edulis-1.jpg", cap: "Ejemplares jóvenes: sombrero pardo, pie claro y robusto." },
      { f: "edulis-2.jpg", cap: "Sombrero pardo-rojizo y pie claro con retículo fino." }],
    rasgos: [
      ["Sombrero", "Canela a pardo, liso, con un ribete blanco característico en el borde."],
      ["Poros", "Blancos al principio, luego amarillo-verdosos. No azulean."],
      ["Pie", "Grueso y panzudo, blanquecino, con un retículo blanco fino en la parte alta."],
      ["Carne", "Blanca e inmutable. Sabor suave, a avellana."],
      ["Dónde", "Coníferas y frondosas: castaños, robles, pinos y hayas."],
      ["Sale", "De finales de verano a finales de otoño, tras 30–40 l/m² y 10–20 °C de día."]] },

  { id: "aereus", group: "excelente", sci: "Boletus aereus", es: "Boleto bronceado (hongo negro)",
    imgs: [{ f: "aereus-1.jpg", cap: "Sombrero muy oscuro y mate." }],
    rasgos: [
      ["Sombrero", "Marrón oscuro a casi negro, seco y aterciopelado; aclara con la edad."],
      ["Poros", "Blancos a amarillentos. No azulean."],
      ["Pie", "Ocre-rojizo, con retículo fino."],
      ["Carne", "Blanca e inmutable."],
      ["Dónde", "Zonas soleadas de robledal, encinar, hayedo o castañar."],
      ["Sale", "De finales de primavera a principios de otoño, con 15–25 °C y 20–30 l/m². Aguanta mejor la sequía."]] },

  { id: "pinophilus", group: "excelente", sci: "Boletus pinophilus", es: "Boleto de los pinos",
    imgs: [{ f: "pinophilus-1.jpg", cap: "Sombrero rojizo oscuro y pie con retículo oscuro." }],
    rasgos: [
      ["Sombrero", "De tonos rojizos a caoba."],
      ["Poros", "Blancos a amarillo-verdosos. No azulean."],
      ["Pie", "Ventrudo, con retículo rojizo."],
      ["Carne", "Blanca e inmutable."],
      ["Dónde", "Sobre todo pinares y coníferas; también hayedos, castañares y robledales."],
      ["Sale", "De finales de primavera a finales de otoño, con 15–25 °C."]] },

  { id: "reticulatus", group: "excelente", sci: "Boletus reticulatus", es: "Boleto de verano",
    imgs: [
      { f: "reticulatus-1.jpg", cap: "Sombrero claro y pie blanquecino." },
      { f: "reticulatus-2.jpg", cap: "En la hojarasca de un robledal." }],
    rasgos: [
      ["Sombrero", "Seco y aterciopelado, de un tono avellana uniforme; se agrieta con tiempo seco."],
      ["Poros", "Blancos a amarillentos. No azulean."],
      ["Pie", "Retículo o malla muy prominente."],
      ["Carne", "Blanca e inmutable; más blanda, se pasa antes."],
      ["Dónde", "Montaña, sobre todo bajo robles; también hayas, castaños y encinas."],
      ["Sale", "En verano y con calor: 15–25 °C y poca lluvia, 15–20 l/m²."]] },

  // ---------- Comestibles con precauciones ----------
  { id: "badia", group: "precaucion", sci: "Imleria badia", es: "Boleto bayo",
    imgs: [{ f: "badia-1.jpg", cap: "Sombrero pardo-chocolate y pie liso." }],
    rasgos: [
      ["Sombrero", "Pardo-chocolate, algo viscoso con humedad."],
      ["Poros", "Crema-amarillentos; azulean verdosos al presionarlos."],
      ["Pie", "Liso, sin retículo."],
      ["Carne", "Blanquecina; puede azulear ligeramente."],
      ["Dónde", "Coníferas y castaños."]] },

  { id: "appendiculatus", group: "precaucion", sci: "Butyriboletus appendiculatus", es: "Boleto apendiculado",
    imgs: [{ f: "appendiculatus-1.jpg", cap: "Pie y poros amarillos." }],
    rasgos: [
      ["Sombrero", "Pardo-rojizo o castaño."],
      ["Poros", "Amarillo limón; azulean."],
      ["Pie", "Amarillo, con retículo fino y base afilada."],
      ["Carne", "Amarilla; azulea un poco. Sabor agradable."],
      ["Dónde", "Robledales, castañares y hayedos."]] },

  { id: "luridiformis", group: "precaucion", sci: "Neoboletus luridiformis", es: "Boleto de pie rojo",
    imgs: [
      { f: "luridiformis-1.jpg", cap: "Sombrero pardo y pie rojo punteado." },
      { f: "luridiformis-2.jpg", cap: "Poros anaranjado-rojizos; mira las zonas azuladas por el roce." }],
    rasgos: [
      ["Sombrero", "Pardo-oliváceo, aterciopelado."],
      ["Poros", "Amarillos con la boca anaranjado-roja; azulean con fuerza."],
      ["Pie", "Punteado de rojo, sin retículo."],
      ["Carne", "Amarilla; azulea intensamente al cortarla."],
      ["Ojo", "Solo bien cocinado: crudo es tóxico."]] },

  // ---------- No comestibles ----------
  { id: "felleus", group: "nocomestible", sci: "Tylopilus felleus", es: "Boleto amargo",
    imgs: [
      { f: "felleus-1.jpg", cap: "Sombrero ocre y pie con retículo pardo." },
      { f: "felleus-2.jpg", cap: "Poros rosados bajo el sombrero: el rasgo clave." }],
    rasgos: [
      ["Sombrero", "Pardo-ocre claro."],
      ["Poros", "Blancos, que se vuelven rosados con la edad."],
      ["Pie", "Retículo oscuro (pardo) sobre fondo claro."],
      ["Carne", "Blanca. Sabor muy amargo."],
      ["Ojo", "Es el doble más habitual del edulis. Tampoco azulea."]] },

  { id: "calopus", group: "nocomestible", sci: "Caloboletus calopus", es: "Boleto de pie bonito",
    imgs: [{ f: "calopus-1.jpg", cap: "Sombrero pálido y pie con tonos rojos." }],
    rasgos: [
      ["Sombrero", "Gris-pardo pálido."],
      ["Poros", "Amarillos; azulean."],
      ["Pie", "Amarillo, con retículo rojo carmín en la base."],
      ["Carne", "Pálida; azulea. Muy amarga."],
      ["Dónde", "Coníferas, suelos ácidos."]] },

  { id: "radicans", group: "nocomestible", sci: "Caloboletus radicans", es: "Boleto radicante",
    imgs: [
      { f: "radicans-1.jpg", cap: "Sombrero blanquecino y pie amarillo." },
      { f: "radicans-2.jpg", cap: "La carne azulea al corte: la diferencia con el edulis." }],
    rasgos: [
      ["Sombrero", "Blanquecino-grisáceo."],
      ["Poros", "Amarillo limón; azulean al tocarlos."],
      ["Pie", "Amarillo, con la base afilada, como enraizada."],
      ["Carne", "Amarillenta pálida; azulea. Amarga."],
      ["Dónde", "Frondosas; más frecuente en suelos calizos."]] },

  // ---------- Tóxicos ----------
  { id: "satanas", group: "toxico", sci: "Rubroboletus satanas", es: "Boleto de Satanás",
    imgs: [{ f: "satanas-1.jpg", cap: "Sombrero pálido y poros rojo-anaranjados." }],
    rasgos: [
      ["Sombrero", "Blanquecino-grisáceo, pálido."],
      ["Poros", "Rojo-anaranjados a rojos; azulean."],
      ["Pie", "Muy grueso y panzudo, con retículo rojo."],
      ["Carne", "Blanco-amarillenta; azulea. Olor desagradable al envejecer."],
      ["Ojo", "Tóxico (gastrointestinal). Raro; suelos calizos."]] },

  { id: "legaliae", group: "toxico", sci: "Rubroboletus legaliae", es: "Boleto de Le Gal",
    imgs: [{ f: "legaliae-1.jpg", cap: "Sombrero rosado y pie rojo." }],
    rasgos: [
      ["Sombrero", "Rosado-pardo."],
      ["Poros", "Rojos; azulean."],
      ["Pie", "Con retículo rojo."],
      ["Carne", "Amarillenta; azulea."],
      ["Ojo", "Tóxico (gastrointestinal)."]] }
];

// Pares confundibles. Texto neutro: sirve igual leído desde cualquiera de las dos fichas.
window.PARES = {
  "edulis|felleus": "El boleto amargo tiene los poros que se vuelven rosados y el pie con retículo oscuro (pardo); el edulis lo tiene blanquecino y fino. Y es muy amargo: la prueba clásica es tocar la carne con la punta de la lengua y escupir.",
  "edulis|pinophilus": "Ambos excelentes. El pinophilus tiene el sombrero más rojizo y oscuro, el pie con tonos rojizos y vive casi siempre bajo pinos.",
  "edulis|reticulatus": "Ambos excelentes. El reticulatus tiene el sombrero más claro y a menudo agrietado, el retículo llega más abajo del pie y sale antes, en verano.",
  "edulis|aereus": "Ambos excelentes. El aereus tiene el sombrero muy oscuro, mate y aterciopelado, y prefiere zonas cálidas.",
  "edulis|radicans": "El radicans tiene el sombrero blanquecino-grisáceo, poros y pie amarillo vivo, y azulea al tocarlo. El edulis nunca azulea. Es amargo.",
  "edulis|badia": "El bayo tiene el pie liso (sin retículo), el sombrero algo viscoso y los poros azulean verdosos al presionarlos.",
  "aereus|reticulatus": "Ambos excelentes. Se distinguen por el sombrero: oscuro y aterciopelado en el aereus, claro y agrietado en el reticulatus.",
  "aereus|pinophilus": "Ambos excelentes. El pinophilus es más rojizo y de pinar; el aereus, casi negro y de frondosas.",
  "aereus|badia": "El bayo tiene el pie liso, sin retículo, y los poros azulean verdosos al presionarlos; el aereus tiene retículo en el pie y los poros no azulean.",
  "reticulatus|radicans": "El radicans azulea al cortarlo o tocarlo y es amargo; el reticulatus no azulea.",
  "pinophilus|felleus": "El boleto amargo tiene los poros que se vuelven rosados, el retículo del pie oscuro y un sabor muy amargo.",
  "luridiformis|satanas": "El satanas tiene el sombrero pálido y los poros rojos; el luridiformis, sombrero pardo oscuro, poros anaranjados y el pie punteado de rojo, sin retículo. Ambos azulean.",
  "luridiformis|legaliae": "El legaliae tiene el sombrero rosado y el pie con retículo rojo; el luridiformis, sombrero pardo-oliváceo y pie punteado. Ambos azulean.",
  "appendiculatus|radicans": "El radicans es amargo y tiene el sombrero blanquecino; el appendiculatus tiene el sombrero pardo-rojizo y sabor agradable.",
  "appendiculatus|calopus": "El calopus tiene el pie con retículo rojo carmín y el sombrero gris pálido; el appendiculatus, el pie amarillo con retículo fino y el sombrero pardo-rojizo.",
  "calopus|radicans": "El calopus tiene retículo rojo en el pie; el radicans, el pie amarillo sin rojo y la base afilada. Ambos son amargos.",
  "calopus|satanas": "El satanas tiene los poros rojos; el calopus, amarillos. Los dos tienen sombrero pálido y tonos rojos en el pie, así que fíjate bien en los poros.",
  "satanas|legaliae": "Ambos tóxicos. El legaliae tiene el sombrero rosado y es más pequeño; el satanas, blanquecino y más robusto."
};
