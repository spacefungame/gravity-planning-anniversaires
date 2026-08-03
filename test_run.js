const str = "1 Heure de Team Game / Événement Adultes";
const regex = /(?:^|[\s/|-])([eéè]v[eéè]nement|soir[eéè]e\s+priv[eéè]e|gala|cocktail)\b/i;
console.log("Matches?", regex.test(str));
