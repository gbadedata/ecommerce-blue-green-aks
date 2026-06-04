// SIGN UP
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const fullname = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const user = {
      fullname,
      email,
      password
    };

    localStorage.setItem("user", JSON.stringify(user));

    alert("Account created successfully!");
    window.location.href = "signin.html";
  });
}


// SIGN IN
const signinForm = document.getElementById("signinForm");

if (signinForm) {
  signinForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const loginEmail = document.getElementById("loginEmail").value;
    const loginPassword = document.getElementById("loginPassword").value;

    const savedUser = JSON.parse(localStorage.getItem("user"));

    if (
      savedUser &&
      savedUser.email === loginEmail &&
      savedUser.password === loginPassword
    ) {
      alert("Login successful!");
      window.location.href = "index.html";
    } else {
      alert("Invalid email or password");
    }
  });
}


// UPLOAD PRODUCT
const uploadForm = document.getElementById("uploadForm");

if (uploadForm) {
  uploadForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const productName = document.getElementById("productName").value;
    const productPrice = document.getElementById("productPrice").value;
    const productDescription = document.getElementById("productDescription").value;
    const productImage = document.getElementById("productImage").files[0];

    const product = {
      productName,
      productPrice,
      productDescription,
      productImage: productImage ? productImage.name : ""
    };

    console.log("Product uploaded:", product);

    alert("Product uploaded successfully! Backend developer will connect this to the database.");
    uploadForm.reset();
  });
}