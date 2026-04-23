import { addRestaurantsFromGoogleMaps } from '../../services/restaurants';

/**
 * Restaurant URLs from Google Maps for bulk import
 */
export const restaurantUrls = [
  "https://www.google.com/maps/place/M9X9%2B4QV+Panimalai+Resto+%26+Cafe+-+Capitol,+Kalibo,+Aklan/@11.7029722,122.3691118,15z/data=!4m9!1m2!2m1!1sRestaurants!3m5!1s0x33a59d2aa651aea3:0x55b3d85f44d7f619!8m2!3d11.6978607!4d122.3694244!16s%2Fg%2F11h4dj5tj8?entry=ml&utm_campaign=ml-bper&coh=230964&g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/McDonald's,+2021+Quezon+Avenue,+Kalibo,+5600+Aklan/@11.7021513,122.3689852,16z/data=!4m9!1m2!2m1!1sRestaurants!3m5!1s0x33a59d0049557dad:0x26787cf56ae83d9f!8m2!3d11.7012776!4d122.3676253!16s%2Fg%2F11vrv3b2fx?utm_campaign=ml-bper&g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/Jollibee,+Mabini,+cor+D.+Maagma+Senior+St,+Poblacion,+Kalibo,+Aklan/@11.7052712,122.3658438,16z/data=!4m9!1m2!2m1!1sRestaurants!3m5!1s0x33a59d83613610bf:0x69abca9d9750b37e!8m2!3d11.704195!4d122.3657455!16s%2Fg%2F11cmgv1w1q?utm_campaign=ml-bper&g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/G%2FF,+Angel's+Pizza+-+Kalibo,+La+Vero+Suites,+Archbishop+Gabriel,+GM+Reyes+Street,+Kalibo,+Aklan/@11.7089784,122.3647217,18z/data=!4m9!1m2!2m1!1sRestaurants!3m5!1s0x33a59d1fbcdd9869:0x481090056056d75e!8m2!3d11.7088986!4d122.3653503!16s%2Fg%2F11k3x8nt5g?utm_campaign=ml-bper&g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/P93G%2B725+Hiraya+Restaurant,+Roxas+Ave+Extention,+Kalibo,+Aklan/@11.703128,122.3751172,17z/data=!4m9!1m2!2m1!1sRestaurants!3m5!1s0x33a59d46d83ab9b7:0x52d4d8057dddbc9a!8m2!3d11.703128!4d122.3751172!16s%2Fg%2F11nxpyv72d?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/Pizza+Dos+Kalibo,+19+Martyrs+St,+Kalibo,+Aklan/@11.7087533,122.364398,18z/data=!4m9!1m2!2m1!1sRestaurants!3m5!1s0x33a59d851699b755:0x93591ffb9489e680!8m2!3d11.7083601!4d122.3644557!16s%2Fg%2F11c60t_55q?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/Kape+Drip+-+Kalibo,+Acevedo+St,+Kalibo,+5600+Aklan/@11.7088235,122.3661045,17z/data=!4m9!1m2!2m1!1sCafe!3m5!1s0x33a59d005f4e3bc5:0x204b85f0ce8114d4!8m2!3d11.7088235!4d122.3661045!16s%2Fg%2F11wfv6hmc6?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/P947%2BWPV+DAILY+DOSE+CAFE,+L.+Barrios+St,+Kalibo,+Aklan/@11.7073554,122.3642989,17z/data=!4m9!1m2!2m1!1sCafe!3m5!1s0x33a59d003fe5be8b:0x37b70ef567e54ac1!8m2!3d11.7073554!4d122.3642989!16s%2Fg%2F11lnrv5rf1?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/M9R8%2BPHX+Dayon+Cafe,+Osme%C3%B1a+Ave,+Kalibo,+Aklan/@11.6917484,122.366566,19z/data=!4m9!1m2!2m1!1sCafe!3m5!1s0x33a59d005f4d79c5:0x3bc26a0efc716288!8m2!3d11.6918711!4d122.3664985!16s%2Fg%2F11vwyxc722?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/Dely's,+1016+5600,+Osme%C3%B1a+Ave,+Kalibo,+Aklan/@11.6917484,122.366566,19z/data=!4m9!1m2!2m1!1sCafe!3m5!1s0x33a59d7a90032663:0x1e1fbeeb22bee22f!8m2!3d11.6918886!4d122.3667669!16s%2Fg%2F11c2pj20bz?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/Pahuway+Cafe,+1004+Western+Nautical+Hwy,+Kalibo,+Aklan/@11.6938865,122.3667991,19z/data=!4m9!1m2!2m1!1sCafe!3m5!1s0x33a59d0023d9eebf:0xae61f6b83e29093b!8m2!3d11.6936282!4d122.3669364!16s%2Fg%2F11yj8p1g3x?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/P938%2BWC7+Shakey's+Kalibo,+Mabini+St,+Kalibo,+Aklan/@11.7048558,122.3660289,19z/data=!4m9!1m2!2m1!1sCafe!3m5!1s0x33a59d849f0fc781:0x698fbe58c3ead862!8m2!3d11.7047855!4d122.3660583!16s%2Fg%2F11ggvy9kqp?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/McDonald's+Kalibo,+968+Roxas+Ave,+Kalibo,+5600+Aklan/@11.7087596,122.3684209,18z/data=!4m6!3m5!1s0x33a59d9aa3e84d2f:0xefedf30e0decdc7e!8m2!3d11.7086555!4d122.3685068!16s%2Fg%2F1233p1plh?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/P94C%2B4XQ+Ribshack+-+Gaisano+Grand+Kalibo,+Roxas+Ave+Extention,+Kalibo,+Aklan/@11.7055262,122.3723014,20z/data=!4m9!1m2!2m1!1sRestaurants!3m5!1s0x33a59d0076b72269:0xc48ccca72b0c3c70!8m2!3d11.7053326!4d122.3724918!16s%2Fg%2F11xrfbsnzd?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/Jollibee,+G%2FF+Gaisano+City+Kalibo,+Roxas+Ave.+Ext,+Kalibo,+Aklan/@11.7063686,122.3712721,19z/data=!4m6!3m5!1s0x33a59d9a49000acf:0x24abd355ce48c600!8m2!3d11.7063942!4d122.3712695!16s%2Fg%2F1hc0zkcbg?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/P94C%2BFGX+Dunkin'+-+Gaisano+Capital+Kalibo,+Roxas+Ave,+Kalibo,+Aklan/@11.7063115,122.3713395,19z/data=!4m6!3m5!1s0x33a59d9a4a297587:0xf42f8c262802e348!8m2!3d11.7062442!4d122.3713543!16s%2Fg%2F11c37ktxlj?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/Mang+Inasal,+J.+Rizal+Street,+Kalibo,+Aklan/@11.7086319,122.362892,19z/data=!4m14!1m7!3m6!1s0x33a59d9a4a297587:0xf42f8c262802e348!2sP94C%2BFGX+Dunkin'+-+Gaisano+Capital+Kalibo,+Roxas+Ave,+Kalibo,+Aklan!8m2!3d11.7062442!4d122.3713543!16s%2Fg%2F11c37ktxlj!3m5!1s0x33a59da6491b0ce3:0x19e89af8419dc943!8m2!3d11.7085535!4d122.36294!16s%2Fg%2F11gz_tps2?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/Pares+Retiro+Kalibo/@11.7092151,122.3638773,20z/data=!4m10!1m7!3m6!1s0x33a59d9a4a297587:0xf42f8c262802e348!2sP94C%2BFGX+Dunkin'+-+Gaisano+Capital+Kalibo,+Roxas+Ave,+Kalibo,+Aklan!8m2!3d11.7062442!4d122.3713543!16s%2Fg%2F11c37ktxlj!3m1!1s0x0:0x35bd8a44a137c301?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/Jollibee+Kalibo+Plaza,+Casa+Felicidad+Martilino+cor.+Arch.+Sts.,+Poblacion,+Kalibo,+Aklan/@11.7092151,122.3638773,20z/data=!4m6!3m5!1s0x33a59d6f51a45d87:0x4624dc7e989f1d37!8m2!3d11.7093683!4d122.3639527!16s%2Fg%2F1tdff6mk?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/Mary's+Refreshment,+Martelino+St,+Kalibo,+Aklan/@11.7092705,122.3638949,20z/data=!4m6!3m5!1s0x33a59d8581915277:0x78e3e683ffeac778!8m2!3d11.7091887!4d122.3637862!16s%2Fg%2F1hc4hbclg?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/TEBanZ+Lapaz+Batchoy+And+Tapsilogan/@11.7098687,122.3666136,19z/data=!4m2!3m1!1s0x0:0x319fbf5c149b2509?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://www.google.com/maps/place/OG+Kopi+Kalibo/@11.6982072,122.3672437,20z/data=!4m2!3m1!1s0x0:0x31aad564ab2248f1?g_ep=Eg1tbF8yMDI1MTAyOV8wIOC7DCoASAJQAg%3D%3D",
  "https://maps.apple.com/?address=724%E2%80%93725%20Roxas%20Avenue,%20Andagaw,%20Kalibo,%205600%20Aklan,%20Philippines&auid=9332283251156867138&ll=11.705087,122.372740&lsp=9902&q=Agora%20Cafe&t=m",
  "https://maps.apple.com/?address=577%20Osme%C3%B1a%20Avenue,%20Estancia,%20Kalibo,%205600%20Aklan,%20Philippines&auid=8971752685377942639&ll=11.693941,122.366683&lsp=9902&q=Pastil%20Point%20-%20Estancia&t=m",
  "https://maps.apple.com/?address=Osme%C3%B1a%20Avenue,%20Estancia,%20Kalibo,%205600%20Aklan,%20Philippines&auid=10668288471883671897&ll=11.696757,122.366973&lsp=9902&q=Solpresso&t=m",
  "https://maps.apple.com/?address=A.%20Mabini%20Street,%20Poblacion,%20Kalibo,%205600%20Aklan,%20Philippines&auid=16602499953907968552&ll=11.705424,122.366970&lsp=9902&q=Minori%20Japanese%20Restaurant%20Kalibo&t=m",
  "https://maps.apple.com/?address=66%20Jaime%20Cardinal%20sin%20Avenue,%20Andagaw,%20Kalibo,%205600%20Aklan,%20Philippines&auid=7689518070739312806&ll=11.695453,122.374389&lsp=9902&q=The%20HiddenBox&t=m",
  "https://maps.apple.com/?address=Osme%C3%B1a%20Avenue,%20Estancia,%20Kalibo,%205600%20Aklan,%20Philippines&auid=14307660199408660954&ll=11.700020,122.367428&lsp=9902&q=K%20Samgyupsal-Gui&t=m"
];

/**
 * Import all the restaurant data from Google Maps URLs
 */
export const importAllRestaurants = async () => {
  try {
    console.log('🚀 Starting bulk restaurant import...');
    await addRestaurantsFromGoogleMaps(restaurantUrls);
    console.log('✅ All restaurants imported successfully!');
    return { success: true, count: restaurantUrls.length };
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
};
