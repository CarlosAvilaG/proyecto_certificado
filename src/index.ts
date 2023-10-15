import { Canister, query, Record, StableBTreeMap, text, update, Vec, Tuple, nat8, Result, Err, Variant, Ok, float32} from 'azle';

const Producto = Record({
  nameProducto: text,
  stock: nat8,
  costo: float32,
  ganancia: float32,
  precioVenta: float32,
})

const Venta = Record({
  neto: float32,
  ganancia: float32,
})

let Error = Variant({
  errortxt: text,
  idDoesNotExist: text,
  idExist: text,
  nameProductoExist: text,
  invalidValue: text,
  doesNotVentas: text,
})

let inventario = StableBTreeMap(text, Producto, 0)
let ventas = StableBTreeMap(nat8, Venta, 1)


export default Canister({

  //Metodo para crear un producto
  //Recibe el id, nombre, stock, cost y el porcentaje de ganacia
  createProducto: update([text, text, nat8, float32, float32], Result(Producto, Error), (id, nameProducto, stock, costo, ganancia) => {

    //Valida que todos las casillas tengan datos, y que lo datos numericos sean mayor de 0
    if (id === "" || nameProducto === "" || stock === 0 || costo <= 0 || costo === null || ganancia <= 0 || ganancia === null) {
      return Err({
          errortxt: "Alguna(s) casillas no estan llenas o el tipo de dato es incorrecto"
        }) 
    }

    else{
      //Calcula el precio de venta en base al costo y el porcentaje de ganancia
      const precioVenta: float32 = costo + (costo * ganancia)/100

      // Crea una copida de la estructura Productos con los datos obtenidos
      const producto: typeof Producto = {
        nameProducto,
        stock,
        costo,
        ganancia,
        precioVenta,
      }

      //Validar si inventario esta vacio
      // if (inventario.isEmpty()) {
      //   inventario.insert(id, producto)
      // }
      // else{
      //Verifica si ya existe un producto en el inventario con la misma id
      if (inventario.containsKey(id)) {
        return Err({
          idExist: id
        }) 
      }

      //Verifica si ya existe un producto con el mismo nombre
      if (!(inventario.isEmpty())) {
        let value = inventario.values()
        for (let i = 0; i < value.length; i++) {
          if (value[i].nameProducto === nameProducto) {
            return Err({
              nameProductoExist: nameProducto
            }) 
          }
        }
      }

      //Inserta el producto a inventario
      inventario.insert(id, producto)       
      // }
      return Ok(producto)
    }

  }),

  // Metodo para obtener los productos almacenado en inventario
  getInventario: query([], Vec(Tuple(text, Producto)), () => {
     return inventario.items();
  }),

  // Metodo para cambiar el nombre de un producto
  // Recibe la id del producto a modificar y el nombre nuevo
  updateNameProduct: update([text, text], Result(Producto, Error), (id, nameProducto) => {
    const productoOpt = inventario.get(id)

    // Valida que la id existe en memoria
    if ('None' in productoOpt) {
      return Err({
          idDoesNotExist: id
      });
    }

    const producto = productoOpt.Some

    const newProducto: typeof Producto = {
      ...producto,
      nameProducto,
    }

    inventario.insert(id,newProducto)

    return Ok(newProducto)
  }),

  // Metodo para cambiar el stock de un producto
  // Recibe la id del producto a modificar y el nuevo stock
  updateStock: update([text, nat8], Result(Producto, Error), (id, stock) => {
    const productoOpt = inventario.get(id)

    if ('None' in productoOpt) {
      return Err({
          idDoesNotExist: id
      });
    }

    const producto = productoOpt.Some

    const newProducto: typeof Producto = {
      ...producto,
      stock,
    }

    inventario.insert(id,newProducto)

    return Ok(newProducto)
  }),

  // Metodo para cambiar el costo de un producto
  // Recibe la id del producto a modificar y el costo nuevo
  updateCosto: update([text, float32], Result(Producto, Error), (id, costo) => {
    const productoOpt = inventario.get(id)

    if ('None' in productoOpt) {
      return Err({
          idDoesNotExist: id
      });
    }

    const producto = productoOpt.Some

    // Calcula un nuevo precio de venta en base al valor de costo nuevo
    const precioVenta: float32 = costo + (costo * producto.ganancia)/100

    const newProducto: typeof Producto = {
      ...producto,
      costo,
      precioVenta,
    }

    inventario.insert(id,newProducto)

    return Ok(newProducto)
  }),

  // Metodo para cambiar el porcentaje de ganancia de un producto
  // Recibe la id del producto a modificar y la nueva ganancia
  updateGanancia: update([text, float32], Result(Producto, Error), (id, ganancia) => {
    const productoOpt = inventario.get(id)

    if ('None' in productoOpt) {
      return Err({
          idDoesNotExist: id
      });
    }

    const producto = productoOpt.Some

    // Nuevamente calcula un nuevo precio de venta, pero esta vez en base al porcentaje de ganancia nuevo
    const precioVenta: float32 = producto.costo + (producto.costo * ganancia)/100

    const newProducto: typeof Producto = {
      ...producto,
      ganancia,
      precioVenta,
    }

    inventario.insert(id,newProducto)

    return Ok(newProducto)
  }),

  //  Metodo para eliminar un producto del inventario
  // Recibe el nombre del producto que se quiere eliminar
  deleteProduct: update([text], Result(Producto, Error), (id) => {
    const productoOpt = inventario.get(id)

    if ('None' in productoOpt) {
      return Err({
          idDoesNotExist: id
      });
    }

    const producto = productoOpt.Some

    inventario.remove(id)

    return Ok(producto)
  }),
  
  // Metodo para registrar las ventas por producto
  // Recibe la id del producto vendido y las piezas vendidas
  updateVentas: update([text, nat8], Result(Producto, Error), (id, sold) => {
    const productoOpt = inventario.get(id)

    if ('None' in productoOpt) {
      return Err({
          idDoesNotExist: id
      });
    }
    
    const producto = productoOpt.Some
    
    // Valida que lo vendido no sea mayor al stock disponible
    if(sold > producto.stock){
      return Err({
          invalidValue: id
      });
    }

    // Resta la cantidad vendida al stock del producto en inventario
    const stock: nat8 = producto.stock - sold

    const newProducto: typeof Producto = {
      ...producto,
      stock,
    }

    inventario.insert(id,newProducto)

    // Registro de cada del neto vendido y ganacia por venta en "ventas"

    // Calcula el total generado *por venta* multiplicando el precio de venta por la cantidad de piezas vendidas del producto
    let neto: float32 = producto.precioVenta * sold
    // Calcula la ganancia obtenida *por venta* restando al neto la multiplicacion del costo del producto por la cantidad de piezas vendidas
    let ganancia: float32 = neto - (producto.costo * sold)

    //En caso de que ya existan ventas registradas, se suman tanto neto y ganancia repectivamente de las ventas registradas a la venta actual
    if (!(ventas.isEmpty())) {
      const ventasAcumuladas = ventas.get(1).Some
      neto += ventasAcumuladas?.neto as float32
      ganancia += ventasAcumuladas?.ganancia as float32
    }
    
    const venta: typeof Venta = {
      neto,
      ganancia,
    }
    ventas.insert(1,venta)

    return Ok(newProducto)
  }),

  // Metodo que muestra el dinero acumulado en ventas
  getVentas: query([], Vec(Venta), () => {
    return ventas.values()
  }),
});