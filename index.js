require('dotenv').config();
const axios = require('axios').default;
const xl = require('excel4node');

const { URLMELI, APPKEY } = process.env;
//we declare categories here 

const categories = {
  'MLA1051': 'Celulares y telefonos',
  'MLA3502': 'Accesorios para Celulares',
  'MLA434353': 'Mallas',
  'MLA3517': 'Cargadores',
  'MLA417718': 'Protectores de Pantalla',
  'MLA1049': 'Accesorios para Cámaras',
  'MLA3518': 'Auriculares y Manos Libres',
  'MLA430918': 'Cables y Hubs USB',
  'MLA3813': 'Repuestos de Celulares',
  'MLA447778': 'Accesorios para PC Gaming',
  'MLA3794': 'Componentes de PC',
  'MLA1000': 'Electrónica, Audio y Video',
  'MLA1430': 'Ropa y Accesorio',
  'MLA5725': 'Accesorios para Vehículos',
  'MLA5726': 'Electrodomésticos y Aires Ac.',
  'MLA1055': 'Celulares y Smartphones',
  'MLA352679': 'Smartwatches',
  'MLA3697': 'Auriculares',
  'MLA417716': 'Flash para Celulares',
  // 'MLA407977': 'Portátiles',
  'MLA9467': 'Memorias',
  'MLA403380': 'Impresoras para Celulares',
  'MLA5337': 'Fundas para Celulares',
  'MLA5338': 'Cables de Datos',
  'MLA432741': 'Gatillos Joystick',
  'MLA429749': 'Cargadores con Cable',
  'MLA38267': 'Iluminadores',
  'MLA9729': 'Hubs USB',
  'MLA414101': 'Para Cámaras Instantáneas',
  'MLA62527': 'Trípodes para Cámaras',
  'MLA17966': 'Fundas y Carcasas Sumergibles',
  'MLA431809': 'Cables de Audio y Video',
  'MLA50088': 'Mochilas',
  'MLA1664': 'Micrófonos',
  'MLA431810': 'Cables de Datos',
  'MLA6049': 'Auriculares',
  'MLA12817': 'Cables Power',
  'MLA10675': 'Displays y LCD'
};

async function init() {

  console.log('++++++========+=========++++++');
  console.log('WORKING');

  let results = [];
  let topSellItems = [];

  const categoriesIds = Object.keys(categories);

  for (let i = 0; i < categoriesIds.length; i++) {

    let categoryId = categoriesIds[i];

    const responseTopSells = await axios.get(`${URLMELI}/highlights/MLA/category/${categoryId}`, {
      headers: {
        'Authorization': `Bearer ${APPKEY}`
      }
    });

    const productsIds = responseTopSells.data.content.filter(p => p.type === 'PRODUCT');
    let products = [];

    for (let l = 0; l < productsIds.length; l++) {

      const product = await axios.get(`${URLMELI}/products/${productsIds[l].id}`);

      if(product.data.buy_box_winner?.item_id) {

        delete product.data.buy_box_winner.sold_quantity;
        products.push({
          ...product.data.buy_box_winner,
          sold_quantity: product.data.sold_quantity,
          id: product.data.buy_box_winner.item_id,
          title: product.data.name,
          permalink: product.data.permalink,
        });
      } else {
        console.log('++++++========+=========++++++');
        console.log(`NOT ITEM FOUND TO PRODUCT ${product.data}`);
      }
    }

    const items = responseTopSells.data.content.filter(i => i.type === 'ITEM');
    console.log('++++++========+=========++++++');
    console.log(`ITEMS TOTAL TO GET ${items.length}`);
    let itemsInfo = [];
    for (let j = 0; j < items.length / 19; j++) {

      let sellSlice = items.slice(19 * j, (19 * j) + 19);

      let resultItems = await axios.get(`${URLMELI}/items?ids=${sellSlice.map(i => i.id).join(',')}`);

      console.log('++++++========+=========++++++');
      console.log(`ITEMS GETTING ${itemsInfo.length}/${items.length}`);

      itemsInfo.push(...resultItems.data.map(i => i.body));
    }

    topSellItems.push(...itemsInfo, ...products);
  };

  const finalItems = removeDuplicateObjects(topSellItems, 'id');

  console.log('++++++========+=========++++++');
  console.log('GETTING VIEWS TO EACH ITEM');
  for (let k = 0; k < finalItems.length; k++) {
    const item = finalItems[k];

    item.category = categories[item.category_id];
    item.free_shipping = item.shipping?.free_shipping;
    if(!item.id) continue;
    const views = await axios.get(`${URLMELI}/visits/items?ids=${item.id}&date_from=2000-06-01T00:00:00.000-00:00&date_to=2023-06-10T00:00:00.000-00:00`, {
      headers: {
        'Authorization': `Bearer ${APPKEY}`
      }
    });

    console.log('++++++========+=========++++++');
    console.log('GETTING shipping data TO EACH ITEM');
    let envioEstandar;
    try {

      const shipping = await axios.get(`${URLMELI}/items/${item.id}/shipping_options?zip_code=5500`);
      envioEstandar = shipping.data.options.filter(a => a.name === 'Estándar a domicilio')[0]?.cost;
    } catch (error) {
      console.error(error);
    }

    results.push({...item, visits: views.data[item.id], costoEnvio: envioEstandar});
  }

  console.log('++++++========+=========++++++');
  console.log('ALEADY GOT ALL DATA');

  saveToXls(results);
}

//BY chat GPT
function saveToXls(data) {
  const XLSX = require('xlsx');

  // Create a workbook object
  const workbook = XLSX.utils.book_new();

  sanitizeObject(data);
  // Convert the data array to a worksheet object
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  console.log('++++++========+=========++++++');
  console.log('SAVING XLSX');
  // Write the workbook to a file
  XLSX.writeFile(workbook, 'data.xlsx');
}

function sanitizeObject(data) {
  data.forEach(element => {

    Object.keys(element).forEach(key => {

      if(typeof element[key] === 'object') {
        if(element[key]) {
          let stringified = JSON.stringify(element[key]);

          //xlsx throw an error when text exceed this caracters
          if(stringified.length < 32767) {
            element[key] = stringified;
          }
        }
      }
    });
  });
}

function removeDuplicateObjects(arr, prop) {
  return arr.filter((obj, pos, arr) => {
      return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
  });
}

init();
