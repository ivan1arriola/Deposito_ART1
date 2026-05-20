# Manual de uso para usuario final

**Sistema:** Depósito ART1  
**Versión de referencia:** 5.5.4  
**Fecha:** 17/05/2026  
**Dirigido a:** personal que consulta, registra y administra información operativa del Depósito General.

## Índice

1. Objetivo del sistema
2. Roles y permisos
3. Ingreso a la aplicación
4. Instalación como app
5. Navegación general
6. Reglas de carga de datos
7. Flujo recomendado de trabajo diario
8. Dashboard principal
9. Personal subalterno
10. Oficiales y suboficiales
11. Stock y equipos
12. Préstamos
13. Talles y reportes
14. Hoja matriz y reportes de equipo
15. Etiquetado y cajas
16. Recordatorios
17. Configuración administrativa
18. Portal de Personal
19. Notificaciones para administradores
20. Problemas frecuentes
21. Buenas prácticas operativas
22. Criterios de control y trazabilidad
23. Guías rápidas por tarea
24. Glosario operativo

## 1. Objetivo del sistema

Depósito ART1 permite administrar la información del Depósito General del Grupo de Artillería 105mm No. 1. Desde la aplicación se puede consultar personal, registrar entregas y devoluciones de equipo, controlar stock, emitir hojas de entrega, gestionar préstamos, imprimir reportes de talles, administrar cajas y etiquetas, y revisar auditoría.

El sistema está pensado para dos tipos de acceso:

- **Usuarios del sistema:** administradores, editores y usuarios de solo lectura.
- **Personal por cédula:** usuarios que ingresan únicamente para consultar su propia ficha.

## 2. Roles y permisos

Las opciones visibles dependen del rol de la cuenta.

| Rol | Qué puede hacer |
| --- | --- |
| Administrador | Tiene acceso total. Puede crear y editar usuarios, cambiar roles, configurar firmas, ver auditoría, activar notificaciones, modificar catálogos y operar todos los módulos. |
| Editor | Puede registrar y modificar datos operativos: personal, movimientos, stock, préstamos, equipos, cajas y reportes. No administra usuarios, firmas ni auditoría. |
| Solo Lectura | Puede consultar información e imprimir documentos. No puede crear, editar, devolver, eliminar ni modificar configuraciones. |
| Personal | Solo consulta su propia ficha, hoja PDF, movimientos, préstamos y datos de contacto. Puede cambiar su contraseña. |

Cómo interpretar los permisos:

- Si no ves un módulo, probablemente tu rol no tenga acceso a esa función.
- Si ves una pantalla pero no aparece el botón de guardar, editar o eliminar, tu rol puede ser de consulta.
- Las acciones administrativas se reservan para usuarios administradores porque afectan seguridad, auditoría, firmas, usuarios y datos maestros.
- Las acciones operativas, como entregas, devoluciones, préstamos y movimientos de stock, deben hacerse con usuarios de sistema autorizados.
- El acceso **Personal por cédula** no reemplaza al usuario de sistema. Es un portal de consulta para cada integrante.

Cuando un usuario necesita más permisos, debe solicitarlo a un administrador. No se recomienda compartir cuentas, porque la auditoría registra las acciones a nombre del usuario que inició sesión.

## 3. Ingreso a la aplicación

1. Abre la dirección web de la aplicación en Chrome o en el navegador indicado por la unidad.
2. En la pantalla **Iniciar sesión**, selecciona el modo de acceso:
   - **Personal por cédula:** ingresa la cédula sin puntos ni guiones y la contraseña.
   - **Usuario del sistema:** ingresa el nombre de usuario y la contraseña asignada.
3. Presiona **Entrar**.

Para cuentas de personal, la contraseña inicial es la misma cédula. Por seguridad, se recomienda cambiarla en el primer ingreso.

Si un usuario del sistema olvida la contraseña, puede usar **Olvidé mi contraseña**. Las cuentas de personal no usan recuperación por correo; deben solicitar el cambio a un administrador.

Detalles del ingreso:

- En **Personal por cédula**, el campo de usuario espera solo números y no más de 8 dígitos.
- En **Usuario del sistema**, se usa el nombre de usuario asignado por el administrador.
- El botón para mostrar u ocultar contraseña permite revisar lo escrito antes de entrar.
- Si el sistema está cargando, espera a que finalice antes de volver a presionar **Entrar**.
- Si la contraseña fue cambiada, la contraseña inicial deja de funcionar.

Recuperación de contraseña de usuario del sistema:

1. Selecciona **Usuario del sistema**.
2. Presiona **Olvidé mi contraseña**.
3. Ingresa el usuario solicitado.
4. Sigue las instrucciones recibidas o solicita apoyo al administrador si no llega el correo.

Si el correo de referencia no está configurado o confirmado, la recuperación puede no completarse. En ese caso, un administrador debe revisar la cuenta desde **Usuarios registrados**.

## 4. Instalación como app

La aplicación puede instalarse en Chrome como una app.

1. Ingresa a la aplicación.
2. Busca el bloque **Instala Depósito ART1 en Chrome**.
3. Presiona **Descargar app** o **Instalar app** si aparece disponible.
4. Si el botón no aparece, usa el menú de Chrome:
   - En celular: menú de tres puntos > **Instalar aplicación**.
   - En escritorio: ícono de instalación en la barra de direcciones.

Después de instalar:

- La app puede abrirse desde el escritorio, pantalla de inicio o menú de aplicaciones.
- Si se actualiza el sistema, normalmente basta con cerrar y volver a abrir la app.
- Si ves una versión antigua, usa **Recargar** o cierra completamente Chrome y abre nuevamente.
- La instalación no cambia los permisos del usuario. El rol sigue siendo el mismo.

## 5. Navegación general

En escritorio, el menú principal está a la izquierda. En celular, se abre desde el botón de menú del encabezado.

Elementos principales:

- **Dashboard:** entrada rápida a los módulos clave y resumen general.
- **Buscador:** permite buscar personal por nombre o cédula.
- **Recargar:** actualiza los datos visibles.
- **Cerrar sesión:** finaliza el acceso del usuario actual.
- **Mensajes de estado:** aparecen cuando se guarda, imprime, descarga o se detecta un error.

Cuando se abre un PDF, recibo o listado, el navegador puede usar una pestaña nueva. Si no aparece, habilita ventanas emergentes para la aplicación.

Detalles de uso:

- En escritorio, el menú queda visible para cambiar de módulo sin volver al dashboard.
- En celular, abre el menú lateral, selecciona el módulo y luego continúa trabajando en la pantalla principal.
- El buscador global es útil para ubicar rápido a una persona antes de abrir su ficha o sus movimientos.
- Algunos botones pueden aparecer deshabilitados mientras faltan datos obligatorios, mientras se está guardando o cuando el rol del usuario no permite esa acción.
- Si aparece un mensaje de carga, espera a que termine antes de presionar nuevamente. Repetir una acción durante la carga puede generar confusión operativa.
- Si una ventana de confirmación solicita aceptar una acción, lee el texto antes de confirmar. Las eliminaciones, unificaciones y algunas correcciones afectan la trazabilidad.
- Los nombres de los módulos pueden variar levemente entre escritorio y celular, pero mantienen la misma función.

Botones y acciones comunes:

| Acción | Uso esperado |
| --- | --- |
| Guardar | Registra los datos cargados en el formulario. |
| Editar | Abre datos existentes para modificarlos. |
| Borrar o Eliminar | Quita un registro luego de confirmar. Debe usarse con cuidado. |
| Imprimir | Abre un PDF, recibo, etiqueta o listado imprimible. |
| Descargar | Guarda una planilla o archivo generado. |
| Limpiar filtros | Vuelve a mostrar el listado completo. |
| Recargar | Trae nuevamente los datos desde el sistema. |
| Ver detalle | Muestra información completa de un registro. |

Trabajo en celular:

- Usa el menú lateral para cambiar de módulo.
- En tablas grandes, desplázate horizontalmente si el navegador lo permite o usa las tarjetas móviles si están disponibles.
- Para imprimir desde celular, verifica que el navegador tenga una impresora configurada o guarda el PDF.
- Si un botón queda fuera de pantalla, desplázate hasta el final del formulario antes de asumir que no existe.

## 6. Reglas de carga de datos

- Las cédulas se ingresan **sin puntos ni guiones**.
- Las fechas visibles se ingresan como **DD/MM/AAAA**. El sistema agrega las barras automáticamente.
- Los campos marcados con `*` son obligatorios.
- En movimientos y préstamos, cada equipo debe cargarse una sola vez por operación.
- Al eliminar o unificar registros, revisa antes de confirmar: algunas acciones son irreversibles.

Recomendaciones de carga:

- Antes de guardar una persona, verifica cédula, grado, batería y nombres. Esos datos se usan en hojas, reportes y búsquedas.
- En campos de cantidad, usa números enteros mayores a cero.
- En comentarios, escribe una explicación breve cuando el movimiento pueda necesitar revisión posterior.
- Para equipos, usa siempre el nombre registrado en el catálogo. Evita crear variantes del mismo nombre si corresponden al mismo artículo.
- Si el sistema informa que una cédula, código o nombre ya existe, revisa el registro existente antes de crear uno nuevo.

Formatos recomendados:

| Dato | Formato recomendado | Ejemplo |
| --- | --- | --- |
| Cédula | Solo números | `12345678` |
| Fecha | Día, mes y año | `17/05/2026` |
| Cantidad | Número entero positivo | `1`, `2`, `10` |
| Código SIE numérico | 8 dígitos | `00005450` |
| Código SIE alfanumérico | 3 letras y 2 números | `ABC12` |
| Estantería | Letra y piso | `A`, piso `1` |

Reglas de calidad de datos:

- No uses abreviaturas distintas para el mismo equipo.
- No cargues una devolución si no estás seguro de qué entrega o préstamo se está cerrando.
- No registres una baja de stock para corregir un préstamo pendiente; primero revisa el origen.
- No cambies nombres de equipos si el cambio altera el sentido histórico del registro.
- No cierres una ventana durante un guardado, impresión o descarga hasta ver respuesta del sistema.

## 7. Flujo recomendado de trabajo diario

Este flujo ayuda a mantener el depósito actualizado y reduce errores de carga.

1. **Ingresar y revisar el dashboard.** Confirma si hay recordatorios urgentes, movimientos recientes o datos que requieren atención.
2. **Buscar novedades de personal.** Si hubo ingresos, reingresos, ascensos o cambios de batería, actualiza primero esos datos.
3. **Registrar altas de personal o equipos.** Carga personas y equipos nuevos antes de generar entregas, préstamos o etiquetas.
4. **Registrar movimientos del día.** Ingresa entregas, devoluciones, altas de stock, bajas de stock y préstamos con fecha correcta.
5. **Controlar préstamos vigentes.** Revisa vencimientos o devoluciones pendientes antes de cerrar la jornada.
6. **Comparar stock operativo.** Consulta depósito interno, total de equipos y existencia SIE cuando corresponda.
7. **Imprimir o descargar reportes.** Genera hojas, recibos, listados o etiquetas luego de verificar los datos.
8. **Revisar auditoría si hubo correcciones.** Los administradores pueden confirmar qué se cambió y quién lo hizo.
9. **Cerrar sesión.** Especialmente si se usó un equipo compartido.

Cuando haya una diferencia entre el stock físico y el sistema, registra primero lo verificable y deja comentario claro en la operación que corrija el dato.

Flujo sugerido por rol:

- **Administrador:** revisar usuarios, auditoría, firmas, catálogos, diferencias de stock y permisos.
- **Editor:** registrar movimientos, actualizar personal, cargar préstamos, controlar stock y emitir documentos.
- **Solo Lectura:** consultar información, imprimir reportes y avisar inconsistencias al personal autorizado.
- **Personal:** revisar su ficha, datos de contacto, equipamiento y hoja de entrega.

Orden recomendado ante una novedad:

1. Identificar si la novedad afecta persona, equipo, préstamo, stock o reporte.
2. Buscar primero el registro existente.
3. Registrar o corregir la información necesaria.
4. Revisar la ficha, stock o historial afectado.
5. Imprimir o enviar documentación si corresponde.
6. Dejar comentario cuando el motivo no sea evidente.

## 8. Dashboard principal

El dashboard muestra métricas de la unidad: subalternos, oficiales y suboficiales, equipos, movimientos y recordatorios urgentes.

Desde **Menú de accesos rápidos** puedes entrar directamente a:

- Ver personal.
- Stock.
- Registrar préstamo.
- Préstamos vigentes.
- Historial de préstamos.
- Recordatorios.
- Etiquetado.
- Auditoría, si eres administrador.

Usos recomendados del dashboard:

- Empezar desde el dashboard cuando no tienes claro qué módulo necesitas.
- Usar los accesos rápidos para operaciones frecuentes.
- Revisar recordatorios antes de registrar préstamos o devoluciones.
- Volver al dashboard después de una carga importante para confirmar que los totales se actualizaron.

Qué revisar en el dashboard:

- Si el total de personal coincide con la situación esperada.
- Si hay recordatorios urgentes o vencidos.
- Si los accesos rápidos muestran los módulos usados con más frecuencia.
- Si una carga reciente se refleja en los indicadores luego de recargar.

El dashboard no reemplaza los reportes detallados. Si necesitas justificar una cantidad, entra al módulo específico y usa la trazabilidad o el listado imprimible.

## 9. Personal subalterno

En **Personal > Personal subalterno** se consulta y gestiona el listado de subalternos.

### Consultar y filtrar

Puedes filtrar por:

- Cédula.
- Apellidos.
- Nombres.
- Batería.

Usa **Limpiar filtros** para volver al listado completo. La tabla muestra CI, grado, apellidos, nombres, batería y acciones disponibles.

Consejos de búsqueda:

- Para cédula, escribe solo números.
- Para apellidos o nombres, puedes escribir una parte del texto.
- Si no encuentras una persona, limpia filtros y vuelve a intentar con la cédula.
- Si hay homónimos, confirma por cédula antes de operar.
- Antes de crear un alta, busca la persona para evitar duplicados.

### Registrar un subalterno

1. Entra en **Altas > Alta de subalterno** o presiona **Registrar subalterno** desde el listado.
2. Completa la identidad:
   - Cédula.
   - Primer apellido.
   - Nombre 1.
   - Celular de contacto, si corresponde.
3. Completa destino:
   - Grado.
   - Batería.
   - Fecha de ingreso o reingreso.
4. Completa tallas y medidas.
5. Opcionalmente agrega **movimientos iniciales** de entrega o devolución.
6. Presiona **Registrar subalterno**.

Si la cédula es inválida o ya existe, el sistema lo informa antes de guardar.

### Qué revisar antes de guardar un alta

Antes de presionar **Registrar subalterno**, confirma:

- Que la cédula pertenezca a la persona correcta.
- Que el grado y batería sean los actuales.
- Que la fecha de ingreso o reingreso esté en formato `DD/MM/AAAA`.
- Que las tallas cargadas coincidan con la información disponible.
- Que los movimientos iniciales sean necesarios y tengan cantidades correctas.

Si falta un dato de talla, el registro puede guardarse, pero luego aparecerá como dato incompleto en los reportes de talles.

Datos de identidad:

- La cédula identifica a la persona dentro del sistema.
- Apellidos y nombres se usan en fichas, hojas y listados.
- El celular de contacto ayuda a mantener actualizada la ficha, pero debe cargarse solo si está disponible.

Datos de destino:

- El grado afecta el orden en listados, hojas y reportes.
- La batería permite filtrar y emitir reportes por agrupación.
- La fecha de ingreso o reingreso ayuda a documentar la situación de servicio.

Tallas:

- Carga todas las tallas conocidas aunque no se impriman inmediatamente.
- Si una talla no se conoce, es preferible completar luego desde edición antes que inventar un dato.
- Revisa los resúmenes de tallas para detectar faltantes.

### Movimientos iniciales

Los movimientos iniciales sirven para dejar cargado el equipamiento que la persona ya tiene al momento de ingresar al sistema.

Usa movimientos iniciales cuando:

- Se registra una persona que ya recibió equipo anteriormente.
- Se migra información desde una planilla o registro físico.
- Se necesita que la Hoja de Entrega refleje el equipo actual desde el primer día.

No los uses para registrar una entrega nueva del día si esa entrega se hará después desde el botón **Entrega**. En ese caso, guarda primero la persona y luego registra el movimiento normal.

Efecto de los movimientos iniciales:

- Una entrega inicial aumenta el equipamiento asignado a la persona.
- Una devolución inicial descuenta equipamiento si se está corrigiendo una situación migrada.
- Los equipos cargados se reflejan en ficha, Hoja de Entrega, movimientos por equipo y stock según corresponda.

### Editar o borrar subalternos

En la fila del subalterno:

- **Editar:** abre el formulario para actualizar datos, destino, contacto y tallas.
- **Borrar:** elimina el registro, luego de confirmar.

Los administradores pueden ver un bloque especial de ascenso cuando corresponde. Antes de ascender a Sargento Primero, el sistema permite imprimir la hoja previa.

Cuándo editar:

- Cambio de grado.
- Cambio de batería.
- Corrección de nombres o apellidos.
- Actualización de celular.
- Carga o corrección de tallas.

Cuándo evitar borrar:

- Si la persona tiene movimientos históricos.
- Si solo se necesita corregir un dato.
- Si la persona egresó pero debe conservarse trazabilidad.

Ante dudas, edita o consulta auditoría antes de eliminar.

### Registrar entrega o devolución individual

1. En el listado, busca la persona.
2. Presiona **Entrega** o **Devolución**.
3. Indica fecha y comentarios si corresponde.
4. Selecciona uno o más equipos.
5. Indica cantidad por equipo.
6. Presiona **Guardar movimiento**.

Para entregas, puede habilitarse **Incluir equipos fuera de hoja de entrega** si se necesita operar con equipos ocultos de la hoja estándar.

Diferencia entre entrega y devolución:

- **Entrega:** registra equipo que pasa a estar asignado a la persona.
- **Devolución:** registra equipo que la persona devuelve al depósito.

Antes de una entrega:

- Confirma que el destinatario sea la persona correcta.
- Verifica que el equipo elegido corresponda al artículo entregado.
- Revisa cantidad y fecha.
- Usa comentarios si la entrega tiene motivo especial, como reposición, campaña, corrección o entrega fuera de hoja.

Antes de una devolución:

- Confirma que el equipo esté realmente en poder de la persona o que la devolución corresponda a una corrección válida.
- Revisa cantidad devuelta.
- Agrega comentario si el equipo vuelve con observaciones, diferencia de estado o aclaración administrativa.

Después de guardar, abre **Ver movimientos** o **Ver ficha completa** para confirmar que el equipamiento actual quedó como esperabas.

### Registrar entrega masiva

1. En **Personal subalterno**, presiona **Registrar entrega masiva**.
2. Selecciona los destinatarios.
3. Carga fecha, comentarios, equipos y cantidades.
4. Guarda el movimiento.

La entrega masiva registra el mismo movimiento para varios subalternos.

Uso recomendado de entrega masiva:

- Entrega de un mismo artículo a varias personas.
- Distribución por batería o por grupo.
- Carga de una entrega planificada donde todos reciben igual cantidad.

Controles antes de guardar una entrega masiva:

- Revisa la lista de destinatarios seleccionados.
- Usa el buscador de destinatarios para no incluir personas incorrectas.
- Si usas **Seleccionar todos**, confirma que el filtro actual sea el deseado.
- Verifica que el equipo y la cantidad a entregar sean iguales para todos.

### Ver tallas, movimientos y ficha completa

En cada persona:

- **Ver tallas:** despliega las tallas cargadas.
- **Ver movimientos:** muestra entregas y devoluciones históricas.
- **Ver ficha completa:** abre una ficha con datos de servicio, tallas, equipamiento actual, observaciones e historial.
- **Hoja de Entrega:** abre la hoja individual en PDF.

Desde el visualizador de movimientos, usuarios con permisos pueden **rectificar** o **eliminar** movimientos. Las rectificaciones quedan registradas en auditoría.

La ficha completa permite revisar en una sola pantalla:

- Datos personales y de servicio.
- Tallas y medidas cargadas.
- Equipamiento actualmente asignado.
- Observaciones.
- Historial de entregas y devoluciones.
- Accesos a impresión cuando corresponda.

### Rectificar o eliminar movimientos

Usa estas acciones solo para corregir errores de carga.

1. Abre **Ver movimientos** en la persona.
2. Ubica el movimiento por fecha, tipo y equipo.
3. Selecciona **Rectificar** si corresponde corregir cantidades, fecha o detalle.
4. Selecciona **Eliminar** solo si el movimiento no debió existir.
5. Confirma la acción y revisa que la ficha quede actualizada.

Cuando rectifiques o elimines, agrega un motivo claro si el sistema lo solicita. Esto facilita auditoría y controles posteriores.

Ejemplos de rectificación:

- Se cargó una cantidad incorrecta.
- Se seleccionó una fecha equivocada.
- Se registró una devolución como entrega.
- Se eligió un equipo incorrecto.

Ejemplos donde conviene registrar un nuevo movimiento:

- La persona devuelve equipo en una fecha posterior.
- Se entrega un reemplazo real.
- Se detecta una diferencia física que debe quedar documentada como ajuste operativo.

### Observaciones

1. Presiona **Observación** en la persona.
2. Carga fecha y texto.
3. Presiona **Guardar observación**.

Desde la misma ventana se pueden editar o borrar observaciones anteriores.

Buenas observaciones:

- Son breves, claras y fechadas.
- Explican situaciones que no se ven solo con movimientos.
- No reemplazan una entrega, devolución o préstamo.
- No deben usarse para modificar cantidades de equipo.

### Hojas y listados

En la parte superior del módulo hay accesos para:

- **Imprimir hojas de entrega:** genera PDF consolidado de toda la unidad.
- **Enviar hojas de entrega al correo de referencia:** envía el PDF consolidado al correo configurado del usuario.
- **Imprimir lista por batería:** genera listado de subalternos ordenado por batería.

El envío por correo requiere que el usuario tenga correo de referencia configurado.

Antes de imprimir o enviar:

- Revisa filtros activos para evitar generar un listado incompleto.
- Confirma que la hoja individual de una persona tenga los equipos esperados.
- Si el PDF consolidado es para archivo o firma, espera a que termine de generarse antes de cerrar la pestaña.
- Si se envía por correo, verifica que el correo de referencia del usuario esté confirmado.

Uso de documentos:

- **Hoja individual:** sirve para revisar o dejar constancia del equipamiento de una persona.
- **PDF consolidado:** sirve para archivo general o control de la unidad.
- **Lista por batería:** sirve para control rápido de personal por agrupación.

Si una hoja no muestra un equipo esperado, revisa si el equipo está oculto de la Hoja de Entrega o si fue cargado como movimiento fuera de hoja.

## 10. Oficiales y suboficiales

En el menú **Oficiales y Suboficiales** se gestionan ambos grupos.

### Consultar

El listado muestra CI, apellido, nombre, grado y tallas principales. Las acciones disponibles son:

- **Ficha:** abre la ficha completa.
- **Editar:** actualiza los datos, si el usuario tiene permiso.

### Registrar oficial o suboficial

1. Entra en **Altas > Alta de oficial** o **Altas > Alta de suboficial**.
2. Completa cédula, apellidos, nombres y celular si corresponde.
3. Selecciona tipo y grado.
4. Completa tallas.
5. Presiona **Registrar oficial** o **Registrar suboficial**.

También existen vistas de resumen de talles por oficiales y por suboficiales.

Consideraciones:

- Oficiales y suboficiales tienen fichas y tallas, pero no se gestionan exactamente igual que el personal subalterno.
- Antes de registrar un préstamo a oficial o suboficial, asegúrate de que esté cargado en el listado correspondiente.
- Los resúmenes de talles de oficiales y suboficiales se consultan desde sus vistas específicas o desde **Resumen de tallas**.
- Si una persona cambia de grupo, revisa el procedimiento administrativo antes de crear un registro duplicado.

## 11. Stock y equipos

El menú **Stock** concentra catálogo de equipos, stock y movimientos.

Conceptos básicos:

- **Equipo:** artículo registrado en el catálogo, por ejemplo una prenda, accesorio o elemento de dotación.
- **Stock interno:** cantidad disponible en depósito.
- **Equipo asignado:** cantidad entregada a personal.
- **Equipo en préstamo:** cantidad prestada temporalmente y pendiente de devolución.
- **Existencia SIE:** referencia externa o administrativa para comparar con el total operativo.

El catálogo de equipos y el stock no son lo mismo. Crear un equipo permite usarlo en el sistema, pero no agrega unidades disponibles. Para sumar unidades al depósito, usa **Alta de stock**.

### Registrar equipo

1. Entra en **Stock > Alta de equipo**.
2. Ingresa el nombre del equipo.
3. Marca si **Aparece en Hoja de Entrega**.
4. Presiona **Registrar equipo**.

Los equipos visibles aparecen en Hoja de Entrega y Hoja Matriz. Los ocultos siguen existiendo para stock, etiquetas o movimientos fuera de hoja.

Cuándo marcar **Aparece en Hoja de Entrega**:

- Marca la opción si el equipo debe salir en hojas individuales y matriz.
- Déjala desmarcada si el equipo se controla internamente, se etiqueta, o se registra como fuera de hoja.

Después de crear un equipo:

1. Revisa que aparezca en **Equipos registrados**.
2. Si corresponde, ajusta su orden de impresión.
3. Si hay unidades físicas disponibles, registra **Alta de stock**.
4. Si el equipo se usará en cajas, revisa también el módulo de etiquetado.

### Equipos registrados

En **Equipos registrados** puedes:

- Ver equipos por estado: visibles y ocultos.
- Ver todos en orden alfabético.
- Editar nombre.
- Mostrar u ocultar de hoja.
- Reasignar o eliminar, según permisos.
- Cambiar el orden que impacta en PDFs y hojas.
- Unificar equipos, reasignando movimientos del origen al destino.

La unificación elimina el equipo origen. Debe usarse solo cuando hay certeza de que dos equipos representan el mismo artículo.

Antes de unificar:

- Confirma que ambos nombres representen exactamente el mismo equipo.
- Revisa si el equipo origen aparece en movimientos históricos, préstamos o cajas.
- Informa a quien use reportes que desde ese momento el equipo quedará consolidado con el nombre destino.

Ejemplos:

- Conviene unificar si existen `Campera` y `CAMPERA` pero son el mismo artículo.
- No conviene unificar si existen `Campera liviana` y `Campera de abrigo`, porque representan artículos distintos.

Cambiar visibilidad:

- Si ocultas un equipo, deja de aparecer en hojas estándar, pero no desaparece del historial.
- Si vuelves a mostrarlo, puede aparecer nuevamente en hojas y matriz.
- La visibilidad no debe usarse para corregir stock; solo controla aparición documental.

### Total de equipos en la unidad

La vista **Total de items** muestra por equipo:

- Cantidad en subalternos.
- Cantidad en préstamo.
- Cantidad en depósito.
- Total de la unidad.
- Existencia SIE.

Los administradores pueden editar la **Existencia SIE** directamente desde la tabla. Al hacer clic en valores de subalternos o préstamos, se abre la trazabilidad del equipo.

Cómo leer las columnas:

- **Subalternos:** cantidad actualmente asignada a personal subalterno.
- **Préstamo:** cantidad prestada y todavía pendiente de devolución.
- **Depósito:** cantidad disponible dentro del depósito interno.
- **Total de la unidad:** suma operativa de subalternos, préstamos y depósito.
- **Existencia SIE:** referencia administrativa cargada para comparar contra el sistema.

La lectura conceptual es:

`Total de la unidad = Subalternos + Préstamo + Depósito`

Si el total operativo no coincide con la existencia SIE, revisa movimientos recientes, préstamos pendientes, bajas de stock y conteo físico.

Ejemplo de lectura:

- Subalternos: `20`
- Préstamo: `3`
- Depósito: `7`
- Total de la unidad: `30`
- Existencia SIE: `30`

En ese caso, sistema y referencia coinciden. Si la Existencia SIE fuera `32`, habría una diferencia de `2` unidades a investigar.

También se puede imprimir el listado en:

- Orden asignado.
- Orden alfabético.

### Depósito interno

La vista **Depósito interno** muestra el stock disponible dentro del depósito. Incluye total de unidades, cantidad de ítems con stock e ítems negativos.

Un ítem negativo indica que el sistema registró más salidas que entradas para ese equipo. En ese caso:

- Revisa si hubo entregas, préstamos o bajas registradas dos veces.
- Confirma si faltó cargar una alta de stock.
- Verifica si una devolución se registró en otro equipo por error.
- Corrige con el movimiento correspondiente y deja comentario.

### Alta o baja de stock

1. Entra en **Alta de stock** o **Baja de stock**.
2. Ingresa fecha.
3. Agrega comentario si corresponde.
4. Carga equipos y cantidades.
5. Presiona **Guardar movimiento**.

Las altas suman stock interno. Las bajas descuentan stock interno.

Cuándo usar alta de stock:

- Ingreso físico de equipo al depósito.
- Corrección documentada de stock luego de conteo.
- Carga inicial de existencias cuando se implementa el sistema.

Cuándo usar baja de stock:

- Egreso físico no asociado a entrega individual ni préstamo.
- Corrección documentada luego de conteo.
- Baja administrativa autorizada.

No uses alta o baja de stock para registrar equipamiento entregado a una persona. Para eso usa entrega o devolución en el módulo de personal.

### Historial de stock

En **Historial** se listan movimientos que impactan stock: ingresos, egresos, entregas, devoluciones, préstamos y devoluciones de préstamos. Cada registro muestra fecha, persona u origen, tipo, unidades y detalle por equipo.

Cómo usar el historial:

- Filtra mentalmente por fecha si estás revisando una diferencia reciente.
- Compara comentarios para entender por qué se registró una alta o baja manual.
- Revisa si un movimiento fue realizado por préstamo, devolución o stock manual.
- Si detectas un error, corrige desde el módulo correspondiente y deja trazabilidad.

### Movimientos por equipo

1. Entra en **Movimientos por equipo**.
2. Busca el equipo por nombre o ID.
3. Usa filtros **Ambas**, **En hoja** o **Fuera de hoja**.
4. Presiona **Ver**.
5. Filtra por tipo: entregas, devoluciones o préstamos pendientes.
6. Imprime PDF si lo necesitas.

Desde el listado se puede abrir la ficha de la persona o ver el origen del movimiento.

Este módulo es el más útil cuando:

- Falta un equipo y necesitas saber quién lo tiene.
- Hay diferencia entre stock físico y sistema.
- Se debe justificar un número en un reporte.
- Se quiere revisar si un equipo fue prestado, entregado o devuelto.

Al imprimir PDF, revisa primero los filtros aplicados. El PDF refleja la vista solicitada.

## 12. Préstamos

El módulo **Préstamos** permite registrar, consultar, devolver, reimprimir recibos e historizar préstamos de equipo.

Estados principales:

- **Pendiente:** el préstamo sigue vigente y debe devolverse.
- **Devuelto:** todos los equipos del préstamo fueron registrados como devueltos.

Estados de equipo usados en préstamo:

- **Nuevo:** equipo sin uso o en condición nueva.
- **Bueno:** equipo en buen estado operativo.
- **Regular:** equipo usable, pero con desgaste o detalle a controlar.
- **Malo:** equipo deteriorado o con observaciones importantes.

Diferencia entre préstamo y entrega:

- Usa **entrega** cuando el equipo queda asignado a la persona como parte de su dotación.
- Usa **préstamo** cuando el equipo se entrega temporalmente y debe volver.
- Un préstamo vigente aparece como pendiente hasta registrar su devolución.
- El préstamo genera recibo, lo que permite documentar retiro temporal y devolución.

### Registrar préstamo

1. Entra en **Préstamos > Registrar préstamo**.
2. Selecciona el tipo de destinatario:
   - Subalterno.
   - Oficial.
   - Suboficial.
3. Busca y selecciona el destinatario.
4. Completa **Por orden de**.
5. Ingresa fecha del préstamo.
6. Agrega fecha estimada de devolución en texto, por ejemplo `10 días`, `fin de campaña` o `2 semanas`.
7. Agrega comentarios si corresponde.
8. Carga equipos, cantidades, estado de entrega y comentario por equipo.
9. Presiona **Solo guardar** o **Guardar e imprimir**.

El recibo puede reabrirse desde el historial o desde préstamos vigentes.

Contenido esperado del préstamo:

- Destinatario.
- Orden o autorización, si corresponde.
- Fecha de préstamo.
- Fecha estimada o texto de devolución.
- Comentarios generales.
- Equipos, cantidades, estado y comentarios por equipo.

Antes de guardar un préstamo, verifica:

- Que el destinatario sea el correcto.
- Que **Por orden de** esté completo si corresponde.
- Que la fecha sea la del retiro real.
- Que cada equipo tenga cantidad, estado y comentario cuando sea necesario.
- Que el recibo se imprima o guarde si debe quedar constancia firmada.

Después de guardar:

- Si usaste **Guardar e imprimir**, revisa el recibo generado.
- Si usaste **Solo guardar**, puedes abrir el recibo después desde vigentes o historial.
- Verifica que el préstamo aparezca en **Prestamos vigentes**.
- Si el destinatario consulta su portal, podrá ver información relacionada según su acceso.

### Préstamos vigentes

En **Préstamos vigentes** se listan los préstamos pendientes. Puedes:

- Buscar por ID.
- Ver detalle.
- Abrir recibo.
- Imprimir resumen.
- Registrar devolución.

Uso diario:

- Revisa esta vista para controlar lo que todavía no volvió.
- Usa el ID cuando tengas un recibo físico y quieras ubicar el registro exacto.
- Abre el detalle antes de devolver para confirmar equipos y cantidades.
- Imprime resumen si necesitas una lista de pendientes.

### Registrar devolución de préstamo

1. Abre el préstamo vigente.
2. Verifica o ajusta el estado de devolución de cada equipo.
3. Agrega comentario de devolución si corresponde.
4. Presiona **Devolver**.
5. Confirma la fecha de devolución.
6. Presiona **Confirmar devolución**.

Checklist antes de confirmar:

- Compara las cantidades devueltas con el recibo original.
- Revisa el estado físico del equipo.
- Escribe comentario si el estado cambió entre la entrega y la devolución.
- Confirma que la fecha de devolución sea correcta.
- Si falta equipo, no cierres el préstamo como devuelto hasta resolver el faltante según el procedimiento de la unidad.

### Historial de préstamos

Muestra todos los préstamos, pendientes y devueltos. Los administradores pueden editar o eliminar registros, indicando motivo de corrección cuando corresponde.

Usa historial para:

- Reimprimir recibos de préstamos ya devueltos.
- Verificar cuándo se devolvió un equipo.
- Revisar quién registró o corrigió un préstamo, si se cruza con auditoría.
- Consultar antecedentes de un destinatario.

No elimines un préstamo solo porque ya fue devuelto. El historial es parte de la trazabilidad.

## 13. Talles y reportes

En **Resumen de tallas** se imprimen nóminas y resúmenes de talles.

Acciones disponibles:

- Imprimir nómina de subalternos.
- Imprimir resumen de subalternos.
- Imprimir nómina y resumen de oficiales.
- Imprimir nómina y resumen de suboficiales.
- Imprimir nómina y resumen de toda la unidad.
- Imprimir resumen por batería.

También se pueden consultar resúmenes en pantalla:

- Subalternos de toda la unidad.
- Subalternos por batería.
- Oficiales y suboficiales.

Si faltan talles, aparece la advertencia **Datos incompletos** con el detalle de personas y prendas sin dato.

Cuando aparezcan datos incompletos:

- Abre la ficha de la persona.
- Completa la talla faltante desde edición.
- Vuelve al resumen y actualiza.
- Imprime recién cuando la información esté revisada.

Cómo usar los reportes de talles:

- Usa la nómina cuando necesitas listado nominal con talles por persona.
- Usa el resumen cuando necesitas cantidades por talle.
- Usa el reporte por batería cuando el pedido o control se organiza por agrupación.
- Usa toda la unidad cuando el control sea general.

Antes de enviar un resumen:

- Revisa datos incompletos.
- Verifica que el grupo sea el correcto: subalternos, oficiales, suboficiales o toda la unidad.
- Confirma que las baterías estén actualizadas.

## 14. Hoja matriz y reportes de equipo

### Hoja Matriz

En **Personal > Hoja matriz**:

1. Selecciona **Toda la Unidad** o **Por Batería**.
2. Si eliges por batería, selecciona la batería.
3. Usa **Vista Previa** para revisar.
4. Usa **PDF** para imprimir o guardar.
5. Usa **Excel** para descargar la planilla.

La matriz se ordena por grado, batería y apellidos.

La Hoja Matriz se usa para revisar equipamiento de varias personas en conjunto. Es útil para:

- Control general de dotación.
- Revisión previa a inspecciones.
- Comparar por batería.
- Preparar documentación de entrega o control.

Si usas **Vista Previa**, revisa en pantalla antes de generar PDF o Excel. Si detectas un dato incorrecto, corrígelo en la ficha o movimiento correspondiente y vuelve a generar.

### Resumen de equipo en baterías

En **Personal > Resumen de equipo en baterías**:

1. Presiona **Cargar resumen** o **Actualizar resumen**.
2. Filtra por nombre de equipo si lo necesitas.
3. Revisa cantidades por batería y total de la unidad.

Este resumen responde preguntas como:

- Cuántas unidades de un equipo tiene cada batería.
- Dónde se concentra determinado artículo.
- Qué batería tiene faltantes o excedentes según control interno.

### Movimientos fuera de hoja

En **Personal > Movimientos fuera de hoja** se listan movimientos de equipos ocultos de la Hoja de Entrega principal.

Puedes:

- Buscar por CI, persona, equipo, fecha u observaciones.
- Ordenar por fecha, equipo o grado.
- Registrar entrega o devolución fuera de hoja, si tienes permisos.
- Imprimir PDF.

Cuándo usar movimientos fuera de hoja:

- Cuando el equipo no debe figurar en la Hoja de Entrega estándar.
- Cuando se controla material complementario o interno.
- Cuando se necesita trazabilidad sin mezclarlo con la dotación principal.

Antes de registrar uno, confirma que el equipo esté correctamente oculto o que corresponda operar fuera de hoja.

## 15. Etiquetado y cajas

El módulo **Etiquetado** permite gestionar códigos SIE, estanterías, cajas y etiquetas.

Orden recomendado de trabajo:

1. Registrar equipos usados en etiquetado.
2. Registrar estanterías.
3. Registrar códigos SIE.
4. Crear cajas con equipos y códigos.
5. Imprimir etiquetas individuales o masivas.
6. Revisar listado de cajas para control físico.

### Códigos SIE

En **Etiquetado > Códigos SIE** puedes:

- Registrar equipos usados para etiquetado.
- Registrar estanterías por piso y letra.
- Registrar códigos SIE asociados a equipo y talla.
- Editar código, talla o equipo asociado.
- Borrar códigos, si tienes permisos.

Formatos válidos de código SIE:

- 8 dígitos, por ejemplo `00005450`.
- 3 letras y 2 números, por ejemplo `ABC12`.

Las estanterías usan una letra de `A` a `Z` y piso `1` o `2`.

Buenas prácticas con códigos:

- Escribe códigos completos, sin espacios extra.
- Usa siempre el equipo y talle correctos.
- Si el código ya existe, revisa antes de intentar duplicarlo.
- Si eliminas un código, revisa si está asociado a cajas.

Buenas prácticas con estanterías:

- Usa letras de forma consistente con la ubicación física.
- Confirma piso antes de imprimir etiquetas.
- Evita crear estanterías duplicadas con nombres parecidos.

### Registrar caja

1. Entra en **Etiquetado > Listado de cajas**.
2. Presiona **Registrar caja**.
3. Selecciona estantería.
4. Selecciona equipos de la caja.
5. Indica cantidad por equipo.
6. Selecciona códigos SIE por equipo o deja **Sin código**.
7. Presiona **Crear caja**.

El sistema asigna automáticamente el número de caja al momento de registrarla.

La cantidad de la caja se calcula automáticamente según los equipos seleccionados.

Uso de **Sin código**:

- Selecciona **Sin código** cuando el equipo está en la caja pero no tiene código SIE individual.
- Usa códigos SIE concretos cuando el artículo debe quedar identificado pieza por pieza.
- No mezcles códigos de otro equipo o talla para completar una caja.

Ejemplo de carga:

- Estantería: `B`, piso `1`.
- Equipo: `Camisa`, cantidad `3`.
- Códigos SIE: dos códigos existentes y una unidad marcada como **Sin código**, si una camisa no tiene código individual.

En ese ejemplo, la caja queda registrada con tres unidades de camisa y puede imprimirse con etiqueta horizontal o vertical.

Antes de crear la caja:

- Confirma que el **Código Dep. Gral.** sea el que se usará físicamente.
- Revisa la estantería seleccionada.
- Verifica cantidades por equipo.
- Revisa que los códigos SIE seleccionados correspondan a los artículos dentro de esa caja.
- Usa **Sin código** solo cuando realmente no exista código individual.

### Listado e impresión de cajas

En el listado puedes:

- Buscar por código de caja, equipo, estantería o código SIE.
- Imprimir listado.
- Imprimir etiqueta individual horizontal (**Imprimir H**).
- Imprimir etiqueta individual vertical (**Imprimir V**).
- Eliminar caja, si tienes permisos.

Uso del listado:

- Sirve para encontrar rápidamente dónde está una caja.
- Permite revisar qué equipos contiene.
- Ayuda a controlar cajas por estantería.
- Permite reimprimir una etiqueta si se pierde o deteriora.

### Impresión masiva

En **Etiquetado > Imprimir todas**:

1. Selecciona orientación horizontal o vertical para todas, o configura por caja.
2. Presiona **Imprimir todas las etiquetas**.

Cada etiqueta se imprime en una hoja A4.

Antes de imprimir todas:

- Revisa que no haya cajas de prueba o duplicadas.
- Confirma orientación horizontal o vertical.
- Verifica la impresora y tamaño de papel.
- Si solo necesitas una etiqueta, usa la impresión individual desde el listado.

## 16. Recordatorios

En **Configuración > Recordatorios** puedes gestionar tareas personales.

Funciones:

- Crear tarea con título, prioridad, fecha límite y detalle.
- Marcar tarea como completada.
- Editar tarea.
- Eliminar tarea.
- Activar u ocultar el widget flotante.
- Cambiar el modelo visual del widget.

Los administradores pueden asignar tareas a otros usuarios de sistema. Las tareas urgentes o vencidas se resaltan automáticamente.

Uso recomendado:

- Crea recordatorios para préstamos con devolución próxima.
- Usa prioridad alta para tareas con vencimiento operativo.
- Marca como completada una tarea apenas se resuelve para mantener limpio el listado.
- Si el recordatorio es para otra persona, confirma que el usuario asignado sea correcto.

Campos habituales:

- **Título:** nombre corto de la tarea.
- **Nota:** detalle operativo o aclaración.
- **Fecha límite:** día en que debe atenderse.
- **Prioridad:** normal o urgente.
- **Asignado a:** usuario responsable, cuando lo define un administrador.

Ejemplos de recordatorios útiles:

- Revisar devolución de préstamo el viernes.
- Controlar talles incompletos de una batería.
- Imprimir etiquetas de cajas nuevas.
- Revisar stock físico contra SIE.

## 17. Configuración administrativa

Algunas opciones solo aparecen a administradores.

### Grados

En **Configuración > Grados registrados** se visualizan, editan y eliminan grados. El orden define la jerarquía usada en listados y reportes.

Antes de editar un grado:

- Revisa si el cambio afectará listados ya impresos.
- Mantén nombres consistentes con el uso institucional.
- Revisa el orden jerárquico luego de editar.

### Baterías

En **Configuración > Baterías registradas** se editan o eliminan baterías. El orden define cómo se muestran en listados.

Antes de editar una batería:

- Confirma que no se trate de una batería existente con personal asignado.
- Evita crear nombres duplicados o variantes innecesarias.
- Revisa reportes por batería luego de cambios importantes.

### Firmas institucionales

En **Configuración > Firmas institucionales** se cargan los datos del Encargado y del Oficial que aparecen en hojas de entrega. Los textos institucionales son fijos; se editan los grados y nombres.

Revisa las firmas antes de imprimir documentación para archivo, firma o presentación. Un dato incorrecto puede obligar a regenerar hojas.

### Usuarios

En **Configuración > Usuarios registrados** se administran cuentas:

- Usuarios de sistema.
- Usuarios de personal.

Acciones disponibles:

- Editar datos de usuario.
- Cambiar rol.
- Cambiar contraseña.
- Confirmar correo de referencia.
- Activar o desactivar.
- Borrar usuarios de sistema.

Las cuentas de personal son de solo consulta y se identifican por cédula.

Detalles importantes:

- **Activar o desactivar:** desactivar impide el acceso sin borrar el historial asociado.
- **Cambiar contraseña:** permite restablecer acceso cuando un usuario no recuerda su clave.
- **Confirmar correo de referencia:** habilita funciones que dependen del correo, como envío de hojas.
- **Cambiar rol:** modifica los permisos disponibles para ese usuario.
- **Borrar usuario de sistema:** úsalo solo cuando no se necesite conservar la cuenta activa. La auditoría histórica de acciones realizadas no debe interpretarse como una cuenta vigente.

Cuándo desactivar en lugar de borrar:

- Cuando el usuario ya no debe ingresar, pero se quiere conservar referencia histórica.
- Cuando hay dudas y se prefiere bloquear temporalmente.
- Cuando la cuenta pertenece a alguien con acciones auditadas importantes.

Cuándo cambiar contraseña:

- Olvido de clave.
- Sospecha de acceso indebido.
- Cambio de responsable de una cuenta operativa, si el procedimiento interno lo permite.

Después de modificar un rol, pide al usuario que cierre sesión y vuelva a entrar para ver sus opciones actualizadas.

### Alta de usuario

1. Entra en **Configuración > Alta de usuario**.
2. Selecciona grado.
3. Ingresa nombre, apellido y usuario.
4. Ingresa contraseña y confirmación.
5. Carga correo de referencia si corresponde.
6. Selecciona rol.
7. Presiona **Crear usuario**.

Antes de crear:

- Define qué rol necesita realmente.
- Evita dar permisos de administrador si solo necesita cargar movimientos.
- Revisa que el usuario sea fácil de identificar.
- Carga correo de referencia si usará recuperación o envío de documentos.

### Auditoría

En **Configuración > Auditoría detallada** el administrador puede revisar acciones registradas por el sistema.

Filtros disponibles:

- Todo.
- Solo movimientos.
- Solo autenticación.
- Usuario.

Cada evento muestra fecha, usuario, acción, entidad afectada y detalle guardado.

Revisión recomendada en auditoría:

- Cambios de contraseña o accesos fallidos.
- Eliminaciones o rectificaciones de movimientos.
- Cambios de stock manual.
- Cambios de roles o usuarios.
- Unificación, eliminación o edición de equipos.

Cómo investigar una diferencia con auditoría:

1. Identifica fecha aproximada y equipo o persona afectada.
2. Revisa primero el historial específico del módulo.
3. Filtra auditoría por usuario o tipo de evento si corresponde.
4. Compara acción, fecha y detalle guardado.
5. Si se confirma un error, corrige desde el módulo operativo y deja comentario.

## 18. Portal de Personal

Cuando una cuenta de personal ingresa por cédula, accede al **Portal de Personal**.

Puede:

- Ver su ficha completa.
- Consultar tallas.
- Consultar equipamiento actual.
- Consultar historial de movimientos y préstamos.
- Ver su Hoja de Entrega PDF si corresponde.
- Actualizar teléfono y correo de contacto.
- Cambiar contraseña.
- Cerrar sesión.

La cuenta de personal no puede modificar movimientos, stock, préstamos ni datos administrativos.

Recomendaciones para personal:

- Cambiar contraseña luego del primer ingreso.
- Revisar que teléfono y correo de contacto estén actualizados.
- Informar al depósito si un equipo entregado no aparece en la ficha.
- Descargar o abrir la Hoja de Entrega cuando se necesite verificar equipamiento asignado.

Qué debe revisar el personal:

- Que sus nombres y apellidos estén correctos.
- Que sus tallas estén completas.
- Que el equipamiento actual coincida con lo recibido.
- Que los préstamos pendientes sean reconocidos.
- Que el teléfono o correo de contacto estén actualizados.

Si detecta un error, debe comunicarlo al depósito. El portal personal no permite corregir movimientos ni modificar stock.

## 19. Notificaciones para administradores

Los administradores pueden activar notificaciones push para recibir avisos de movimientos e inicios de sesión.

1. Si aparece el bloque **Notificaciones admin**, presiona **Activar notificaciones**.
2. Acepta el permiso del navegador.
3. Si el navegador bloquea notificaciones, habilítalas desde la configuración del sitio.

Las notificaciones requieren navegador compatible y HTTPS, salvo en entornos locales.

Si no aparecen notificaciones:

- Verifica que el navegador permita notificaciones para el sitio.
- Confirma que se haya presionado **Activar notificaciones**.
- Revisa si el sistema operativo bloquea notificaciones del navegador.
- En celulares, confirma que Chrome tenga permiso para mostrar avisos.

Recomendaciones:

- Activa notificaciones solo en dispositivos de confianza.
- No aceptes notificaciones en equipos compartidos si otros usuarios pueden verlas.
- Si cambias de equipo, vuelve a activar el permiso desde el nuevo navegador.
- Si dejas de administrar el sistema, revoca permisos del navegador.

## 20. Problemas frecuentes

### No se abre un PDF o recibo

Habilita ventanas emergentes para la aplicación y vuelve a presionar el botón de impresión. Si el navegador descarga el archivo en lugar de abrirlo, revisa la carpeta de descargas.

### El botón de guardar está deshabilitado

Revisa que estén completos los campos obligatorios, que la cédula sea válida y que las cantidades sean mayores a cero.

También puede quedar deshabilitado si:

- Ya hay un equipo repetido en la misma operación.
- Falta seleccionar destinatario.
- La fecha no tiene formato válido.
- Tu usuario no tiene permiso de edición.

### No aparece un equipo en una entrega

Verifica si el equipo está oculto de Hoja de Entrega. Para entregas fuera de hoja, habilita la opción correspondiente o usa el módulo **Movimientos fuera de hoja**.

### No puedo enviar hojas por correo

El usuario debe tener correo de referencia configurado. Si el correo no está verificado o no existe, solicita revisión al administrador.

### No puedo editar usuarios, firmas o auditoría

Esas funciones son exclusivas de administradores.

### La aplicación no me deja ingresar como personal

Ingresa la cédula solo con números. Si la contraseña inicial ya fue cambiada y no la recuerdas, solicita restablecimiento a un administrador.

### La fecha aparece inválida

Carga la fecha como `DD/MM/AAAA`. Ejemplo: `17/05/2026`. Si copias una fecha desde otro lugar, borra el campo y escríbela nuevamente.

### La cédula ya existe

Busca la persona por cédula antes de intentar crearla. Puede estar registrada como subalterno, oficial, suboficial o usuario de personal.

### No veo un módulo del menú

Puede deberse al rol de tu usuario. Las opciones administrativas solo aparecen para administradores y algunas acciones de edición no se muestran a usuarios de solo lectura.

### Las notificaciones quedaron bloqueadas

Abre la configuración del sitio en el navegador y cambia el permiso de notificaciones a **Permitir**. Luego vuelve a la aplicación y activa nuevamente las notificaciones.

### El stock no coincide con el conteo físico

Revisa historial de stock, movimientos por equipo, préstamos vigentes y bajas manuales. Si debes corregir, registra el movimiento correspondiente con comentario claro.

### Aparece stock negativo

Un stock negativo normalmente indica una salida sin entrada previa o una devolución mal asociada. Revisa el historial del equipo antes de hacer una corrección manual.

### No encuentro una persona en el buscador

Limpia filtros, busca por cédula sin puntos ni guiones y verifica si pertenece a otro grupo: subalterno, oficial o suboficial.

### El recibo de préstamo no coincide con lo entregado

No registres la devolución hasta revisar el préstamo. Si el error fue de carga, un administrador o usuario con permisos debe corregirlo según el procedimiento interno y dejar motivo.

### Una etiqueta se imprimió con orientación incorrecta

Vuelve al listado de cajas y usa **Imprimir H** o **Imprimir V** según corresponda. Para impresión masiva, revisa la orientación antes de imprimir todas.

### Un equipo aparece duplicado con nombres similares

No sigas cargando movimientos en ambos nombres. Revisa movimientos y, si son el mismo artículo, un administrador puede unificarlos. Si son artículos distintos, ajusta los nombres para diferenciarlos.

### El correo de recuperación o envío no llega

Verifica que el correo de referencia esté cargado y confirmado. Revisa spam o correo no deseado. Si continúa el problema, solicita revisión al administrador.

### La app instalada no muestra cambios recientes

Presiona **Recargar**. Si sigue igual, cierra la app instalada y vuelve a abrirla. En navegador, también puedes actualizar la pestaña.

## 21. Buenas prácticas operativas

- Antes de registrar préstamos o entregas, verifica que el destinatario correcto esté seleccionado.
- Usa comentarios cuando el movimiento necesite explicación posterior.
- Revisa el recibo o PDF luego de generarlo.
- Mantén actualizados grados, baterías y equipos para que reportes y hojas salgan correctamente.
- Usa la auditoría para revisar cambios sensibles.
- Evita eliminar o unificar equipos sin confirmar que no se perderá trazabilidad.
- Revisa periódicamente los talles incompletos para mejorar la calidad de reportes.
- No borres registros para corregir diferencias simples si una rectificación o movimiento documentado resuelve el problema con mejor trazabilidad.
- Revisa préstamos vigentes antes de registrar una baja de stock por faltante.
- Compara periódicamente existencia SIE, total del sistema y conteo físico.
- Usa nombres de equipos consistentes para evitar duplicados.
- Antes de imprimir reportes para firma, revisa filtros, fecha, destinatario y datos institucionales.
- En equipos compartidos, cierra sesión al terminar.

Buenas prácticas de seguridad:

- No compartas usuario y contraseña.
- Cambia contraseña si sospechas que otra persona la conoce.
- No dejes la sesión abierta en computadoras compartidas.
- Usa roles mínimos necesarios para cada usuario.
- Desactiva usuarios que ya no deban ingresar.

Buenas prácticas documentales:

- Imprime recibos cuando haya entrega temporal que deba firmarse.
- Guarda PDFs o listados según el procedimiento de la unidad.
- Revisa firmas institucionales antes de emitir documentos formales.
- Evita imprimir reportes con datos incompletos si serán usados para control oficial.

## 22. Criterios de control y trazabilidad

La trazabilidad es la posibilidad de saber qué pasó, cuándo pasó, quién lo registró y a qué persona o equipo afectó.

Para mantener trazabilidad:

- Usa entregas y devoluciones para movimientos de personal.
- Usa préstamos para entregas temporales.
- Usa alta o baja de stock para movimientos internos del depósito.
- Usa observaciones para aclaraciones, no para reemplazar movimientos.
- Usa auditoría para revisar cambios sensibles.
- Usa comentarios cuando el motivo no sea evidente.

Qué revisar ante una diferencia de equipo:

1. Busca el equipo en **Total de items**.
2. Revisa subalternos, préstamo, depósito y existencia SIE.
3. Abre trazabilidad desde los valores disponibles.
4. Consulta **Movimientos por equipo**.
5. Revisa **Prestamos vigentes**.
6. Consulta **Historial de stock**.
7. Si el error viene de una carga, rectifica o registra el movimiento correcto.

Qué revisar ante una diferencia en una persona:

1. Abre la ficha completa.
2. Revisa equipamiento actual.
3. Revisa movimientos históricos.
4. Verifica préstamos vigentes o historial.
5. Si hay un equipo fuera de hoja, revisa **Movimientos fuera de hoja**.
6. Corrige con movimiento, rectificación u observación según corresponda.

Principio general: si una acción cambia cantidades, debe registrarse como movimiento. Si solo explica una situación, puede registrarse como observación o comentario.

## 23. Guías rápidas por tarea

### Alta de persona con equipo ya entregado

1. Busca la cédula para confirmar que no exista.
2. Entra en **Alta de subalterno**.
3. Carga identidad, destino, fecha y tallas.
4. Agrega movimientos iniciales solo para equipo ya recibido.
5. Guarda.
6. Abre la ficha completa y revisa equipamiento actual.
7. Imprime Hoja de Entrega si corresponde.

### Entrega individual del día

1. Busca la persona.
2. Presiona **Entrega**.
3. Carga fecha del día.
4. Agrega comentario si corresponde.
5. Selecciona equipos y cantidades.
6. Guarda.
7. Revisa ficha o movimientos.
8. Imprime hoja si debe quedar constancia.

### Devolución individual

1. Busca la persona.
2. Presiona **Devolución**.
3. Carga fecha real de devolución.
4. Selecciona equipos y cantidades devueltas.
5. Agrega comentario si hay observaciones.
6. Guarda.
7. Verifica que el equipamiento actual haya descontado correctamente.

### Préstamo temporal

1. Entra en **Registrar prestamo**.
2. Selecciona tipo de destinatario.
3. Busca destinatario.
4. Completa orden, fecha y devolución estimada.
5. Carga equipos, cantidades, estado y comentarios.
6. Guarda e imprime si necesita firma.
7. Controla luego desde **Prestamos vigentes**.

### Devolución de préstamo

1. Entra en **Prestamos vigentes**.
2. Busca por ID o destinatario.
3. Abre detalle.
4. Revisa cantidades y estado físico.
5. Carga estado y comentario de devolución.
6. Confirma fecha.
7. Finaliza devolución.
8. Verifica en historial.

### Control de stock físico contra sistema

1. Realiza conteo físico.
2. Abre **Total de items** y compara contra total del sistema.
3. Revisa **Depósito interno** para cantidades disponibles.
4. Consulta préstamos vigentes y movimientos por equipo.
5. Si corresponde, registra alta o baja de stock con comentario.
6. Actualiza existencia SIE solo si tienes permiso y respaldo para hacerlo.

### Creación e impresión de caja

1. Registra o confirma equipos de etiquetado.
2. Registra códigos SIE si corresponde.
3. Confirma estantería.
4. Entra en **Listado de cajas**.
5. Registra caja con código, estantería, equipos y códigos.
6. Guarda.
7. Imprime etiqueta horizontal o vertical.
8. Revisa físicamente que la etiqueta coincida con la caja.

### Revisión de datos incompletos de talles

1. Entra en **Resumen de tallas**.
2. Revisa advertencias de datos incompletos.
3. Abre la persona afectada.
4. Edita tallas faltantes.
5. Actualiza el resumen.
6. Imprime luego de confirmar que no queden faltantes importantes.

## 24. Glosario operativo

- **Alta:** registro nuevo en el sistema.
- **Baja de stock:** salida o descuento de unidades del depósito interno.
- **Batería:** agrupación o destino usado para ordenar personal y reportes.
- **Código Dep. Gral.:** código interno asignado a una caja del Depósito General.
- **Código SIE:** código identificador usado para etiquetado o referencia administrativa.
- **Depósito interno:** stock disponible dentro del depósito.
- **Entrega:** movimiento que asigna equipo a una persona.
- **Existencia SIE:** cantidad de referencia administrativa cargada para comparar con el sistema.
- **Hoja de Entrega:** documento individual con equipamiento asignado.
- **Hoja Matriz:** reporte general de equipamiento por personal.
- **Movimiento fuera de hoja:** entrega o devolución de equipo que no aparece en la Hoja de Entrega estándar.
- **Préstamo:** entrega temporal de equipo con devolución pendiente.
- **Rectificación:** corrección de un movimiento existente.
- **Stock negativo:** cantidad menor a cero, normalmente causada por salidas sin entradas suficientes o errores de carga.
- **Trazabilidad:** historial que permite seguir una persona, equipo o movimiento.
