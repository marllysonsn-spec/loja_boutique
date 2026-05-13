const firebaseConfig = {
  apiKey: "AIzaSyClZWD_AtYeBkWueBJ5K8CjMPJc5nY7YsU",
  authDomain: "projeto-boutique.firebaseapp.com",
  databaseURL: "https://projeto-boutique-default-rtdb.firebaseio.com",
  projectId: "projeto-boutique",
  storageBucket: "projeto-boutique.firebasestorage.app",
  messagingSenderId: "586822447202",
  appId: "1:586822447202:web:19e4bc9f17158e88f1a13b"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();

const isAdminPage = window.location.pathname.includes("admin");

const STORAGE_KEY = 'modaBellaProducts';

let editMode = false;
let editId = null;

// imagens do admin em edição
let editImages = [];

// galeria do modal cliente
let currentImages = [];
let currentIndex = 0;

/* =======================
   PRODUTOS PADRÃO
======================= */

const defaultProducts = [
    {
        id: 1,
        name: 'Vestido Elegance',
        price: 189.90,
        discount: 0,
        emoji: '👗',
        images: [],
        section: 'lancamentos'
    },
    {
        id: 2,
        name: 'Bolsa Nude Premium',
        price: 249.90,
        discount: 20,
        emoji: '👜',
        images: [],
        section: 'ofertas'
    }
];

/* =======================
   STORAGE
======================= */

async function getProducts() {

    const snapshot = await db.ref("products").once("value");

    const data = snapshot.val();

    console.log("FIREBASE DATA:", data);

    if (!data) {
        return defaultProducts;
    }

    // se já for array
    if (Array.isArray(data)) {
        return data;
    }

    // se for objeto
    return Object.values(data);
}

async function saveProducts(products) {

    const updates = {};

    products.forEach(product => {
        updates[product.id] = product;
    });

    await db.ref("products").set(updates);

    await renderProducts();
    await updateAdminTable();
}

/* =======================
   RENDER PRODUTOS
======================= */

async function renderProducts() {

    const products = await getProducts();

    const lancamentosGrid = document.getElementById('lancamentosGrid');
    const descontosGrid = document.getElementById('descontosGrid');

    lancamentosGrid.innerHTML = '';
    descontosGrid.innerHTML = '';

    products.forEach(product => {

        const hasDiscount = product.discount > 0;

        const oldPrice = (
            product.price / (1 - product.discount / 100)
        ).toFixed(2);

        const image = product.images?.[0];

        const card = `
            <div class="product-card">

                ${hasDiscount ? `
                    <div class="discount-badge">
                        -${product.discount}%
                    </div>
                ` : ''}

                <div class="product-image">

                    ${
                        image
                        ? `<img src="${image}">`
                        : `<div class="product-image-fallback">
                            ${product.emoji || '📦'}
                        </div>`
                    }

                </div>

                <div class="product-info">

                    <div class="product-name">
                        ${product.name}
                    </div>

                    ${
                        hasDiscount
                        ? `<div class="old-price">
                            R$ ${oldPrice.replace('.', ',')}
                        </div>`
                        : ''
                    }

                    <div class="product-price">
                        R$ ${product.price.toFixed(2).replace('.', ',')}
                    </div>

                    <button class="product-btn"
                        onclick='openProductModal(${JSON.stringify(product)})'>
                        Comprar agora
                    </button>

                </div>

            </div>
        `;

        if (product.section === 'ofertas') {
            descontosGrid.innerHTML += card;
        } else {
            lancamentosGrid.innerHTML += card;
        }

    });

}

/* =======================
   MODAL PRODUTO (CLIENTE)
======================= */

function openProductModal(product){

    const modal = document.getElementById('productModal');

    currentImages = product.images || [];
    currentIndex = 0;

    updateModalImage();

    document.getElementById('modalName').innerText = product.name;

    document.getElementById('modalPrice').innerText =
        "R$ " + product.price.toFixed(2).replace('.', ',');

    const oldPriceEl = document.getElementById('modalOldPrice');

    if(product.discount > 0){
        const oldPrice = (
            product.price / (1 - product.discount / 100)
        ).toFixed(2);

        oldPriceEl.innerText =
            "R$ " + oldPrice.replace('.', ',');
    } else {
        oldPriceEl.innerText = '';
    }

    modal.classList.add('active');
}

function updateModalImage(){

    const img = document.getElementById('modalImage');

    if(currentImages.length > 0){
        img.src = currentImages[currentIndex];
    } else {
        img.src = '';
    }
}

function nextImage(){

    if(currentImages.length <= 1) return;

    currentIndex = (currentIndex + 1) % currentImages.length;
    updateModalImage();
}

function prevImage(){

    if(currentImages.length <= 1) return;

    currentIndex =
        (currentIndex - 1 + currentImages.length)
        % currentImages.length;

    updateModalImage();
}

function closeProductModal(){
    document.getElementById('productModal')
        .classList.remove('active');
}

/* =======================
   ADMIN PANEL
======================= */

async function toggleAdmin(){

    const customerView = document.getElementById('customerView');
    const adminPanel = document.getElementById('adminPanel');

    if (adminPanel.classList.contains('active')) {
        adminPanel.classList.remove('active');
        customerView.style.display = 'block';
    } else {
        adminPanel.classList.add('active');
        customerView.style.display = 'none';
        await updateAdminTable();
    }
}

/* =======================
   TABELA ADMIN
======================= */

async function updateAdminTable() {

    const tbody = document.getElementById('productsTableBody');

    tbody.innerHTML = '';

    const products = await getProducts();

    products.forEach(product => {

        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>
                ${
                    product.images?.[0]
                    ? `<img src="${product.images[0]}" class="product-thumb">`
                    : product.emoji
                }
            </td>

            <td>${product.name}</td>

            <td>R$ ${product.price.toFixed(2).replace('.', ',')}</td>

            <td>${product.discount || 0}%</td>

            <td>
                <button onclick="editProduct(${product.id})">Editar</button>
                <button onclick="deleteProduct(${product.id})">Excluir</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

/* =======================
   UPLOAD + EDIT
======================= */

const form = document.getElementById('formAddProduct');

if(form){
    form.addEventListener('submit', handleSubmit);
}

function handleSubmit(event) {

    event.preventDefault();

    const fileInput = document.getElementById('prodImages');
    const files = fileInput.files;

    if (files.length > 0) {

        const newImages = [];
        let loaded = 0;

        for (let i = 0; i < files.length; i++) {

            const reader = new FileReader();

            reader.onload = function(e) {

                newImages.push(e.target.result);
                loaded++;

                if (loaded === files.length) {

                    const finalImages = editMode
                        ? [...editImages, ...newImages]
                        : newImages;

                    saveProduct(finalImages);
                }

            };

            reader.readAsDataURL(files[i]);
        }

    } else {

        const finalImages = editMode ? editImages : [];
        saveProduct(finalImages);
    }
}

/* =======================
   SAVE PRODUCT
======================= */

async function saveProduct(imagesArray) {

    const products = await getProducts();

    const productData = {
        id: editMode ? editId : Date.now(),
        name: document.getElementById('prodName').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        discount: parseFloat(document.getElementById('prodDiscount').value) || 0,
        emoji: document.getElementById('prodEmoji').value || '📦',
        images: imagesArray,
        section: document.getElementById('prodSection').value
    };

    if (editMode) {

        const index = products.findIndex(p => p.id === editId);
        products[index] = productData;

        editMode = false;
        editId = null;

        editImages = [];

        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('submitBtn').innerText = 'Adicionar produto';

    } else {
        products.push(productData);
    }

    await saveProducts(products);

    document.getElementById('formAddProduct').reset();

    alert('Produto salvo com sucesso!');
}

/* =======================
   EDIT PRODUCT
======================= */

async function editProduct(id){

    const products = await getProducts();

    const product = products.find(p => p.id === id);

    document.getElementById('prodName').value = product.name;
    document.getElementById('prodPrice').value = product.price;
    document.getElementById('prodDiscount').value = product.discount;
    document.getElementById('prodEmoji').value = product.emoji;
    document.getElementById('prodSection').value = product.section || 'lancamentos';

    editImages = product.images || [];

    renderImagePreview(editImages);

    editMode = true;
    editId = id;

    document.getElementById('submitBtn').innerText = 'Salvar alterações';

    switchAdminTab(
        { target: document.querySelector('.admin-tab[onclick*="adicionar"]') },
        'adicionar'
    );
}

/* =======================
   PREVIEW IMAGENS ADMIN
======================= */

function renderImagePreview(images){

    const preview = document.getElementById('imagePreview');

    preview.innerHTML = '';

    images.forEach(img => {

        const el = document.createElement('img');
        el.src = img;

        preview.appendChild(el);
    });
}

/* =======================
   DELETE
======================= */

async function deleteProduct(id) {

    if (!confirm('Deseja excluir este produto?')) return;

    const products = await getProducts();

    const updated = products.filter(p => p.id !== id);

    await saveProducts(updated);
}

/* =======================
   UI HELPERS
======================= */

function switchAdminTab(event, tabName) {

    document.querySelectorAll('.admin-tab')
        .forEach(tab => tab.classList.remove('active'));

    document.querySelectorAll('.tab-content')
        .forEach(content => content.classList.remove('active'));

    event.target.classList.add('active');

    document.getElementById(`tab-${tabName}`)
        .classList.add('active');
}

function scrollToSection(id) {
    document.getElementById(id)
        .scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', async () => {

    if(document.getElementById('lancamentosGrid')){
        await renderProducts();
    }

  

});




const admins = [
    "marllysonsn@gmail.com"
];

function loginWithGoogle(){

    const provider =
        new firebase.auth.GoogleAuthProvider();

    firebase.auth()
        .signInWithPopup(provider)

        .then((result) => {

            const user = result.user;

            if(admins.includes(user.email)){

                document.getElementById('loginScreen')
                    .style.display = 'none';

                document.getElementById('adminPanel')
                    .style.display = 'block';

                updateAdminTable();

            } else {

                alert("Acesso não autorizado");

                firebase.auth().signOut();
            }

        })

        .catch((error) => {

            console.log(error);

            alert("Erro ao fazer login");
        });
}


firebase.auth().onAuthStateChanged(user => {

    const login =
        document.getElementById('loginScreen');

    const admin =
        document.getElementById('adminPanel');

    if(user && admins.includes(user.email)){

        if(login) login.style.display = 'none';

        if(admin){
            admin.style.display = 'block';
            updateAdminTable();
        }

    } else {

        if(login) login.style.display = 'flex';

        if(admin){
            admin.style.display = 'none';
        }
    }
});
