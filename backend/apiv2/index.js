const express = require('express');

const helmet = require('helmet');
const morgan = require('morgan');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();

app.use(cors({
    origin: ["http://localhost:3000", "http://44.223.27.165"],
    credentials: true
}));
// Middleware (igual que tu estructura)
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('common'));

// Conexión a BD (ajusta con tus credenciales)
const connection = mysql.createConnection({
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASWORD,
    database : process.env.DB 
});


  connection.connect(()=>{
    console.log('Conectado a Mysql') 
});
const validateEmpleado = (req, res, next) => {
    const { nombres, apellidos, salario_base, telefono } = req.body;
    
    if (!nombres || !apellidos) {
        return res.status(400).json({ 
            message: "Los campos nombres y apellidos son obligatorios" 
        });
    }
    
    if (salario_base && isNaN(parseFloat(salario_base))) {
        return res.status(400).json({ 
            message: "El salario base debe ser un número válido" 
        });
    }
    
    if (telefono && !/^[\d\s\-()+]+$/.test(telefono)) {
        return res.status(400).json({ 
            message: "El formato del teléfono no es válido" 
        });
    }
    
    next();
};
const validateSucursal = (req, res, next) => {
    const { nombre } = req.body;
    
    if (!nombre) {
        return res.status(400).json({ 
            message: "El campo nombre es obligatorio" 
        });
    }
    
    next();
};


//Devuelve todos los empleados
app.get("/apiv2/empleado", (req, res) => {
    connection.query(
        'SELECT e.*, s.nombre as nombre_sucursal FROM empleado e LEFT JOIN sucursal s ON e.idsucursal = s.idsucursal', 
        function(error, rows, fields) {
            if(error){
                res.status(500).json(error);
            }else{
                res.status(200).json(rows);
            }
        }
    );
});

//Crea un empleado 
app.post("/apiv2/empleado",validateEmpleado, (req, res) => {
    const { nombres, apellidos, telefono, direccion, salario_base, idsucursal } = req.body;
    
    connection.query(
        'INSERT INTO empleado (nombres, apellidos, telefono, direccion, salario_base, idsucursal) VALUES (?, ?, ?, ?, ?, ?)',
        [nombres, apellidos, telefono, direccion, salario_base, idsucursal], 
        function(error, rows, fields) {
            if(error){
                res.status(500).json(error);
            }else{
                res.status(201).json({ message: "Empleado creado exitosamente", id: rows.insertId });
            }
        }
    );
});

//Actualiza un empleado
app.put("/apiv2/empleado/:id",validateEmpleado, (req, res) => {
    const id = req.params.id;
    const { nombres, apellidos, telefono, direccion, salario_base, idsucursal } = req.body;
    
    connection.query(
        'UPDATE empleado SET nombres = ?, apellidos = ?, telefono = ?, direccion = ?, salario_base = ?, idsucursal = ? WHERE idempleado = ?',
        [nombres, apellidos, telefono, direccion, salario_base, idsucursal, id], 
        function(error, rows, fields) {
            if(error){
                res.status(500).json(error);
            }else{
                if(rows.affectedRows === 0){
                    res.status(404).json({ message: "Empleado no encontrado" });
                }else{
                    res.status(200).json({ message: "Registro actualizado" });
                }
            }
        }
    );
});

//Elimina un empleado
app.delete("/apiv2/empleado/:id", validateEmpleado,(req, res) => {
    const id = req.params.id;
    
    connection.query(
        'DELETE FROM empleado WHERE idempleado = ?',
        id, 
        function(error, rows, fields) {
            if(error){
                res.status(500).json(error);
            }else{
                if(rows.affectedRows === 0){
                    res.status(404).json({ message: "Empleado no encontrado" });
                }else{
                    res.status(200).json({ message: "Empleado eliminado" });
                }
            }
        }
    );
});

//hace el conteo de los empleados 
app.get("/apiv2/empleado/conteo",(req, res) => {

    
    connection.query('SELECT COUNT(*) as total FROM empleado', function(error, results, fields) {
        
        if(error){
            console.log("❌ Error en conteo:", error);
            return res.status(500).json({ error: error.message });
        }
        
        const total = results[0].total
        
        res.status(200).json({ 
            total_empleados: parseInt(total),
            message: `Hay ${total} empleados registrados`
        });
    });
});

//devuelva todos los empleados con el nombre de la sucursal a la que pertenecen
app.get("/apiv2/empleado/empleadosucursal",(req, res) => {
    
    const query = `SELECT e.*, s.nombre as nombre_sucursal FROM empleado e INNER JOIN sucursal s ON e.idsucursal = s.idsucursal`;
    
    connection.query(query, function(error, results, fields) {
        
        if(error){
            return res.status(500).json({ error: error.message });
        }

        
        res.status(200).json({
            total_registros: results.length,
            empleados: results
        });
    });
});
// Devuelve un empleado
app.get("/apiv2/empleado/:id", validateEmpleado,(req, res) => {
    const id = req.params.id;
    
    connection.query(
        'SELECT * FROM empleado WHERE idempleado = ?', 
        id, 
        function(error, rows, fields) {
            if(error){
                res.status(500).json(error);
            }else{
                if(rows.length === 0){
                    res.status(404).json({ message: "Empleado no encontrado" });
                }else{
                    res.status(200).json(rows[0]);
                }
            }
        }
    );
});


//Devuelve todas las sucursales
app.get("/apiv2/sucursal",validateSucursal, (req, res) => {
    connection.query('SELECT * FROM sucursal', function(error, rows, fields) {
        if(error){
            res.status(500).json(error);
        }else{
            res.status(200).json(rows);
        }
    });
});

//Crea una sucursal
app.post("/apiv2/sucursal", validateSucursal,(req, res) => {
    const { nombre, direccion, telefono } = req.body;
    
    connection.query(
        'INSERT INTO sucursal (nombre, direccion, telefono) VALUES (?, ?, ?)',
        [nombre, direccion, telefono], 
        function(error, rows, fields) {
            if(error){
                res.status(500).json(error);
            }else{
                res.status(201).json({ message: "Sucursal creada exitosamente", id: rows.insertId });
            }
        }
    );
});

//Actualiza una sucursal
app.put("/apiv2/sucursal/:id", validateSucursal,(req, res) => {
    const id = req.params.id;
    const { nombre, direccion, telefono } = req.body;
    
    connection.query(
        'UPDATE sucursal SET nombre = ?, direccion = ?, telefono = ? WHERE idsucursal = ?',
        [nombre, direccion, telefono, id], 
        function(error, rows, fields) {
            if(error){
                res.status(500).json(error);
            }else{
                if(rows.affectedRows === 0){
                    res.status(404).json({ message: "Sucursal no encontrada" });
                }else{
                    res.status(200).json({ message: "Sucursal actualizada" });
                }
            }
        }
    );
});

//Elimina una sucursal
app.delete("/apiv2/sucursal/:id", validateSucursal,(req, res) => {
    const id = req.params.id;
    
    connection.query(
        'DELETE FROM sucursal WHERE idsucursal = ?',
        id, 
        function(error, rows, fields) {
            if(error){
                res.status(500).json(error);
            }else{
                if(rows.affectedRows === 0){
                    res.status(404).json({ message: "Sucursal no encontrada" });
                }else{
                    res.status(200).json({ message: "Sucursal eliminada" });
                }
            }
        }
    );
});



//Calcula salario total
app.post("/apiv2/empleado/salario/:id", (req, res) => {
    const id = req.params.id;
    const { bonos, descuentos } = req.body;
    
    console.log(`📊 Calculando salario para empleado ${id}`, { bonos, descuentos });
    
    // Validar datos requeridos
    if (bonos === undefined || descuentos === undefined) {
        return res.status(400).json({ 
            message: "Los campos 'bonos' y 'descuentos' son requeridos" 
        });
    }
    
    // Primero obtener el salario base del empleado
    connection.query(
        'SELECT salario_base FROM empleado WHERE idempleado = ?',
        [id], 
        function(error, rows, fields) {
            if(error){
                console.log("❌ Error en consulta:", error);
                return res.status(500).json({ error: error.message });
            }
            
            if(rows.length === 0){
                return res.status(404).json({ message: "Empleado no encontrado" });
            }
            
            const salarioBase = parseFloat(rows[0].salario_base) || 0;
            const bonosNum = parseFloat(bonos) || 0;
            const descuentosNum = parseFloat(descuentos) || 0;
            
            const salarioTotal = salarioBase + bonosNum - descuentosNum;
            
            console.log("✅ Cálculo exitoso:", { salarioBase, bonosNum, descuentosNum, salarioTotal });
            
            res.status(200).json({
                id_empleado: parseInt(id),
                salario_base: salarioBase,
                bonos: bonosNum,
                descuentos: descuentosNum,
                salario_total: salarioTotal
            });
        }
    );
});

//Calcula comisión
app.post("/apiv2/empleado/comision/:id", (req, res) => {
    const id = req.params.id;
    const { venta_mensual } = req.body;
    
    console.log(`💰 Calculando comisión para empleado ${id}`, { venta_mensual });
    

    if (venta_mensual === undefined) {
        return res.status(400).json({ 
            message: "El campo 'venta_mensual' es requerido" 
        });
    }
    
    // Obtener salario base del empleado
    connection.query(
        'SELECT salario_base FROM empleado WHERE idempleado = ?',
        [id], 
        function(error, results, fields) {
            if(error){
                console.log("❌ Error en consulta:", error);
                return res.status(500).json({ error: error.message });
            }
            
            if(results.length === 0){
                return res.status(404).json({ message: "Empleado no encontrado" });
            }
            
            const salarioBase = parseFloat(results[0].salario_base) || 0;
            const ventaMensual = parseFloat(venta_mensual) || 0;
            
            const comisionVentas = ventaMensual * 0.05;
            const comisionSalario = salarioBase * 0.05;
            const comisionTotal = comisionVentas + comisionSalario;
            
            console.log("✅ Cálculo de comisión exitoso:", {
                salarioBase, 
                ventaMensual, 
                comisionTotal 
            });
            
            res.status(200).json({
                id_empleado: parseInt(id),
                salario_base: salarioBase,
                venta_mensual: ventaMensual,
                comision_ventas: comisionVentas,
                comision_salario: comisionSalario,
                comision_total: comisionTotal
            });
        }
    );
});


// Puerto y inicio del servidor
const PORT = process.env.PORT || 8800;
app.listen(PORT, () => {
    console.log(`Apiv2 ejecutándose en puerto ${PORT}`);
});