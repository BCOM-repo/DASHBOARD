const mysql=require('mysql');
//Conexion de la base de datos

const connection =mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'root',
    database:'tvradioapp3'
});

//Conectar la base de datos
connection.connect((err)=>{
if(err){
console.error('Error conectando la base de datos,',err);
return;
}
console.log('Conexion exitosa a la base de datos');




});