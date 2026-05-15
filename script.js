const firebaseConfig = {
  apiKey: "AIzaSyClZWD_AtYeBkWueBJ5K8CjMPJc5nY7YsU",
  authDomain: "projeto-boutique.firebaseapp.com",
  databaseURL: "https://projeto-boutique-default-rtdb.firebaseio.com",
  projectId: "projeto-boutique",
  storageBucket: "projeto-boutique.firebasestorage.app",
  messagingSenderId: "586822447202",
  appId: "1:586822447202:web:19e4bc9f17158e88f1a13b"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

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
let cart = [];
const CART_KEY = "boutique_cart";
let currentUser = null;

let selectedSize = '';
let selectedColor = '';
let currentProduct = null;

function loadLocalCart() {

    const saved = localStorage.getItem(CART_KEY);

    if (saved) {
        cart = JSON.parse(saved);
    } else {
        cart = [];
    }

    updateCartUI();
}

function saveLocalCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

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

    const lancamentosGrid =
        document.getElementById('lancamentosGrid');

    const descontosGrid =
        document.getElementById('descontosGrid');

    // se não existir a grid, para a função
    if(!lancamentosGrid || !descontosGrid){
        return;
    }

    const products = await getProducts();

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

    currentProduct = product;

    selectedSize = '';
    selectedColor = '';

    const modal = document.getElementById('productModal');

    currentImages = product.images || [];
    currentIndex = 0;

    updateModalImage();

    document.getElementById('modalName').innerText = product.name;

    document.getElementById('modalPrice').innerText =
        "R$ " + product.price.toFixed(2).replace('.', ',');

        const sizeOptions =
    document.getElementById('sizeOptions');

const colorOptions =
    document.getElementById('colorOptions');

sizeOptions.innerHTML = '';
colorOptions.innerHTML = '';

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

    document.getElementById('modalDescription')
    .innerText = product.description || '';

    if(product.sizes){

    product.sizes.split(',').forEach(size => {

        sizeOptions.innerHTML += `
    <button
        class="option-btn"
        onclick="selectOption(this, 'size')">

        ${size.trim()}

    </button>
`;

    });
if(product.colors){

    product.colors.split(',').forEach(color => {

        colorOptions.innerHTML += `
            <button
                class="option-btn"
                onclick="selectOption(this, 'color')">

                ${color.trim()}

            </button>
        `;

    });

}

document.getElementById('buyNowBtn')
    .onclick = () => buyNow(product);

document.getElementById('addCartBtn')
    .onclick = () => addToCart(product);
}

if(product.colors){

    product.colors.split(',').forEach(color => {

        colorOptions.innerHTML += `
    <button
        class="option-btn"
        onclick="selectOption(this, 'color')">

        ${color.trim()}

    </button>
`;

    });

}

document.getElementById('modalSizes')
    .innerText =
    product.sizes
        ? "Tamanhos: " + product.sizes
        : '';

document.getElementById('modalColors')
    .innerText =
    product.colors
        ? "Cores: " + product.colors
        : '';
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

function addToCart(product){

    const selectedSize =
        document.querySelector('.size-option.selected');

    const selectedColor =
        document.querySelector('.color-option.selected');

    if(!selectedSize || !selectedColor){

        alert("Selecione tamanho e cor");

        return;
    }

    const item = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        size: selectedSize.innerText,
        color: selectedColor.innerText
    };

    cart.push(item);

    updateCartUI();

    alert("Produto adicionado ao carrinho!");
}

function saveCartToFirebase() {

    if (!currentUser) return;

    firebase.database()
        .ref("carts/" + currentUser.uid)
        .set({
            items: cart
        });
}

function loadUserCart(uid) {

    firebase.database()
        .ref("carts/" + uid)
        .once("value")
        .then(snapshot => {

            const data = snapshot.val();

            if (data && data.items) {

                // 🔥 mescla Firebase + local
                cart = [...cart, ...data.items];

                saveLocalCart();
                updateCartUI();
            }

        });
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

    price: parseFloat(
        document.getElementById('prodPrice').value
    ),

    discount: parseFloat(
        document.getElementById('prodDiscount').value
    ) || 0,

    emoji:
        document.getElementById('prodEmoji').value || '📦',

    description:
        document.getElementById('prodDescription').value,

    sizes:
        document.getElementById('prodSizes').value,

    colors:
        document.getElementById('prodColors').value,

    images: imagesArray,

    section:
        document.getElementById('prodSection').value
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
    
    document.getElementById('prodDescription').value =
    product.description || '';

document.getElementById('prodSizes').value =
    product.sizes || '';

document.getElementById('prodColors').value =
    product.colors || '';
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

    loadLocalCart();
});



function loginWithGoogle(){

    const provider =
        new firebase.auth.GoogleAuthProvider();

    firebase.auth()
        .signInWithPopup(provider)

        .then((result) => {

            const user = result.user;

            document.getElementById('loginScreen')
    .style.display = 'none';

document.getElementById('adminPanel')
    .style.display = 'block';

        })

        .catch((error) => {

            console.log(error);

            alert("Erro ao fazer login");
        });
}


firebase.auth().onAuthStateChanged(async user => {

    updateAuthUI(user);

    const login = document.getElementById('loginScreen');
    const admin = document.getElementById('adminPanel');

    // ======================
    // CLIENTE
    // ======================
    if (user) {

        currentUser = user;

        await loadUserCart(user.uid);

        syncLocalCartToFirebase();

    } else {

        currentUser = null;
        cart = [];
        updateCartUI();
    }

    // ======================
    // ADMIN
    // ======================
    if (login) login.style.display = user ? 'none' : 'flex';

    if (admin) {
        admin.style.display = user ? 'block' : 'none';

        if (user) {
            await updateAdminTable();
        }
    }
});


function logout(){

    firebase.auth().signOut()
        .then(() => {

            window.location.reload();

        });

}


function selectOption(button, type){

    const container =
        button.parentElement;

    container
        .querySelectorAll('.option-btn')
        .forEach(btn => {

            btn.classList.remove('active');

        });

    button.classList.add('active');

    if(type === 'size'){
        selectedSize = button.innerText;
    }

    if(type === 'color'){
        selectedColor = button.innerText;
    }
}



function buyProduct(){

    if(!selectedSize){

        alert("Selecione um tamanho");

        return;
    }

    if(!selectedColor){

        alert("Selecione uma cor");

        return;
    }

    const phone =
        "5521971925807";
    const productLink = window.location.href;
    const message = `
Olá! Tenho interesse neste produto:

 Produto: ${currentProduct.name}

 Preço: R$ ${currentProduct.price
    .toFixed(2)
    .replace('.', ',')}

 Tamanho: ${selectedSize}

 Cor: ${selectedColor}

 Produto:
${productLink}
`;

    const url =
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
}

function addToCart(){

    if(!selectedSize){

        alert("Selecione um tamanho");
        return;
    }

    if(!selectedColor){

        alert("Selecione uma cor");
        return;
    }

    const item = {

        id: currentProduct.id,

        name: currentProduct.name,

        price: currentProduct.price,

        image: currentProduct.images?.[0] || '',

        size: selectedSize,

        color: selectedColor

    };

    cart.push(item);

    updateCartUI();
    saveLocalCart();
    saveCartToFirebase();

    alert("Produto adicionado ao carrinho!");

   

}

function updateCartUI(){

    const cartItems =
        document.getElementById('cartItems');

    if(!cartItems) return;

    cartItems.innerHTML = '';

    cart.forEach((item, index) => {

        cartItems.innerHTML += `
    <div class="cart-item">

        <input
            type="checkbox"
            class="cart-check"
            onchange="updateCheckoutButton()"
            data-index="${index}">

        <img src="${item.image}" />

        <div class="cart-item-info">

            <h4>${item.name}</h4>

            <p>Tamanho: ${item.size}</p>
            <p>Cor: ${item.color}</p>

            <strong>
                R$ ${item.price.toFixed(2).replace('.', ',')}
            </strong>

        </div>

        <button class="remove-cart-btn"
            onclick="removeFromCart(${index})">
            Remover
        </button>

    </div>
`;
    });

    updateCheckoutButton();
}

function updateCheckoutButton(){

    const checked =
        document.querySelectorAll('.cart-check:checked');

    const button =
        document.getElementById('checkoutBtn');

    const total = checked.length;

    button.innerText =
        `Comprar ${total} produto${total !== 1 ? 's' : ''}`;
}



function openCart(){

    document.getElementById('cartModal')
        .classList.add('active');
}

function closeCart(){

    document.getElementById('cartModal')
        .classList.remove('active');
}


function checkoutWhatsApp(){

    const checked =
        document.querySelectorAll('.cart-check:checked');

    if(checked.length === 0){

        alert("Selecione pelo menos um produto");

        return;
    }

    const phone = "5521971925807";

    let message =
`Olá! Tenho interesse nos seguintes produtos:

`;

    checked.forEach(check => {

        const index =
            check.dataset.index;

        const item =
            cart[index];

        message +=
`
━━━━━━━━━━━━━━━

 Produto: ${item.name}

 Tamanho: ${item.size}

 Cor: ${item.color}

 Preço:
R$ ${item.price.toFixed(2).replace('.', ',')}

 Produto:
${window.location.href}

`;
    });

    message += `
━━━━━━━━━━━━━━━

Aguardo atendimento 
`;

    const url =
`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
}





function loginCustomer() {

    const provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth()
        .signInWithPopup(provider)
        .then(result => {
            console.log("Logado:", result.user.email);
        })
        .catch(err => {
            console.log(err);
            alert("Erro ao logar");
        });
}

function logoutCustomer() {

    firebase.auth().signOut();
}

function syncLocalCartToFirebase() {

    if (!currentUser) return;

    firebase.database()
        .ref("carts/" + currentUser.uid)
        .set({
            items: cart
        });
}

function updateAuthUI(user) {

    const loginBtn = document.getElementById("loginBtn");
    const userBox = document.getElementById("userBox");
    const userGreeting = document.getElementById("userGreeting");

    // 🔥 SAFE GUARD completo
    if (!loginBtn || !userBox) return;

    if (user) {

        firebase.database()
            .ref("users/" + user.uid)
            .update({
                name: user.displayName || "",
                email: user.email || "",
                photoURL: user.photoURL || "",
                lastLogin: Date.now()
            });

        loginBtn.style.display = "none";
        userBox.style.display = "flex";

        const firstName = (user.displayName || "cliente").split(" ")[0];

        if (userGreeting) {
            userGreeting.innerText = `Olá, ${firstName}`;
        }

    } else {

        loginBtn.style.display = "inline-block";
        userBox.style.display = "none";

        if (userGreeting) {
            userGreeting.innerText = "";
        }
    }
}

function openProfile() {

    const user = firebase.auth().currentUser;
    if (!user) return;

    document.getElementById("profileModal").style.display = "block";

    firebase.database()
        .ref("users/" + user.uid)
        .once("value")
        .then(snapshot => {

            const data = snapshot.val();

            document.getElementById("profileData").innerHTML = `
                <p><strong>Nome:</strong> ${data?.name || ""}</p>
                <p><strong>Email:</strong> ${data?.email || ""}</p>
                <p><strong>Último login:</strong> ${new Date(data?.lastLogin).toLocaleString()}</p>
            `;
        });
}

function closeProfile() {
    document.getElementById("profileModal").style.display = "none";
}



function goToProfile() {
    window.location.href = "pages/profile.html";
}

if (window.location.pathname.includes("profile")) {

    firebase.auth().onAuthStateChanged(user => {

        if (!user) {
            window.location.href = "index.html";
            return;
        }

        firebase.database()
            .ref("users/" + user.uid)
            .once("value")
            .then(snapshot => {

                const data = snapshot.val();

                if (!data?.phone) {
    document.getElementById("profileModal").style.display = "flex";
}

                

                const el = document.getElementById("profileInfo");

                if (!el) return;

                el.innerHTML = `
                    <p><strong>Nome:</strong> ${data?.name || ""}</p>
                    <p><strong>Email:</strong> ${data?.email || ""}</p>
                    <p><strong>Último login:</strong> ${
                        data?.lastLogin
                            ? new Date(data.lastLogin).toLocaleString()
                            : ""
                    }</p>
                `;
            });
    });
}

function loadProfileCart(uid) {

    firebase.database()
        .ref("carts/" + uid)
        .once("value")
        .then(snapshot => {

            const data = snapshot.val();
            const container = document.getElementById("cartList");

            if (!data || !data.items || data.items.length === 0) {
                container.innerHTML = "<p>Carrinho vazio</p>";
                return;
            }

            container.innerHTML = "";

            data.items.forEach(item => {

                container.innerHTML += `
                    <div class="profile-cart-item">

                        <img src="${item.image || ''}" class="profile-cart-img">

                        <div class="profile-cart-info">

                            <div class="profile-cart-name">
                                ${item.name}
                            </div>

                            <div class="profile-cart-meta">
                                ${item.size} | ${item.color}
                            </div>

                            <div class="profile-cart-price">
                                R$ ${item.price.toFixed(2).replace('.', ',')}
                            </div>

                        </div>

                    </div>
                `;
            });

        });
}

function removeFromCart(index) {

    cart.splice(index, 1);

    updateCartUI();
    saveLocalCart();
    saveCartToFirebase();
}
function openProfileEdit() {

    const user = firebase.auth().currentUser;
    if (!user) return;

    firebase.database()
        .ref("users/" + user.uid)
        .once("value")
        .then(snapshot => {

            const data = snapshot.val();

            document.getElementById("profilePhone").value = data?.phone || "";
            document.getElementById("profileBirthdate").value = data?.birthdate || "";
            document.getElementById("profileAddress").value = data?.address || "";
            document.getElementById("profileGender").value = data?.gender || "";

            document.getElementById("profileModal").style.display = "flex";
        });
}

function closeProfileEdit() {
    document.getElementById("profileModal").style.display = "none";
}



function saveProfileData() {

    const user = firebase.auth().currentUser;
    if (!user) return;

    const phone = document.getElementById("profilePhone").value;
    const birthdate = document.getElementById("profileBirthdate").value;
    const address = document.getElementById("profileAddress").value;
    const gender = document.getElementById("profileGender").value;

    if (!phone) {
        alert("Telefone é obrigatório");
        return;
    }

    firebase.database()
        .ref("users/" + user.uid)
        .update({
            phone,
            birthdate,
            address,
            gender,
            name: user.displayName || "",
            email: user.email || "",
            updatedAt: Date.now()
        })
        .then(() => {
            alert("Dados atualizados com sucesso!");
            closeProfileEdit();
        })
        .catch(err => {
            console.log(err);
            alert("Erro ao salvar dados");
        });
}


