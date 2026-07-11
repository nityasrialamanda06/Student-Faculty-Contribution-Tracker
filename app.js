import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBkJu2lz1DRHDln_0Yc8cwB7YjpqsUtT2I",
  authDomain: "contribution-tracker-e3aa3.firebaseapp.com",
  projectId: "contribution-tracker-e3aa3",
  storageBucket: "contribution-tracker-e3aa3.firebasestorage.app",
  messagingSenderId: "341939734020",
  appId: "1:341939734020:web:728c6f156681b2720d5751"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.signup = async function() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const role = document.getElementById("signupRole").value;
  const department = document.getElementById("department").value;
  if (!name || !email || !password || !department) { alert("Please fill all fields."); return; }
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await addDoc(collection(db, "users"), { uid: result.user.uid, name, email, role, department });
    alert("Account created! Please login.");
    window.location.href = "index.html";
  } catch (err) { alert("Signup failed: " + err.message); }
}

window.login = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const uid = result.user.uid;
    const q = query(collection(db, "users"), where("uid", "==", uid));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      localStorage.setItem("role", userData.role);
      localStorage.setItem("name", userData.name);
      localStorage.setItem("uid", uid);
      if (userData.role === "admin") window.location.href = "admin.html";
      else if (userData.role === "faculty") window.location.href = "faculty.html";
      else window.location.href = "student.html";
    } else { alert("No role found for this user. Contact admin."); }
  } catch (err) { alert("Login failed: " + err.message); }
}

window.logout = function() { localStorage.clear(); window.location.href = "index.html"; }

window.submitAchievement = async function() {
  const title = document.getElementById("title").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  const date = document.getElementById("date").value;
  const proof = document.getElementById("proof").value;
  if (!title || !description || !date || !proof) { alert("Please fill all fields."); return; }
  await addDoc(collection(db, "submissions"), {
    uid: localStorage.getItem("uid"), name: localStorage.getItem("name"), role: localStorage.getItem("role"),
    title, category, description, date, proof, status: "Pending", submittedOn: new Date().toISOString()
  });
  alert("Submitted!");
  document.getElementById("title").value = "";
  document.getElementById("description").value = "";
  document.getElementById("date").value = "";
  document.getElementById("proof").value = "";
  loadMySubmissions();
}

window.loadMySubmissions = async function() {
  const q = query(collection(db, "submissions"), where("uid", "==", localStorage.getItem("uid")));
  const snapshot = await getDocs(q);
  let html = "";
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    const badgeColor = d.status === "Approved" ? "#2ecc71" : d.status === "Rejected" ? "#e74c3c" : "#f39c12";
    html += `<p><b>${d.title}</b> (${d.category}) - Status: <b style="color:${badgeColor}">${d.status}</b></p>`;
  });
  document.getElementById("mySubmissions").innerHTML = html || "No submissions yet.";
}

window.loadAllSubmissions = async function() {
  const filter = document.getElementById("filterStatus")?.value || "All";
  const snapshot = await getDocs(collection(db, "submissions"));
  let rows = "";
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    if (filter !== "All" && d.status !== filter) return;
    rows += `<tr>
      <td>${d.name || "-"}</td><td>${d.role || "-"}</td><td>${d.category}</td><td>${d.title}</td><td>${d.status}</td>
      <td>
        <button onclick="updateStatus('${docSnap.id}','Approved')" style="width:auto; display:inline-block; padding:4px 8px; margin:2px;">Approve</button>
        <button onclick="updateStatus('${docSnap.id}','Rejected')" style="width:auto; display:inline-block; padding:4px 8px; margin:2px; background:#e74c3c;">Reject</button>
      </td>
    </tr>`;
  });
  document.getElementById("tableBody").innerHTML = rows || `<tr><td colspan="6">No submissions found.</td></tr>`;
}

window.updateStatus = async function(id, status) {
  await updateDoc(doc(db, "submissions", id), { status });
  loadAllSubmissions();
}

window.exportPDF = function() {
  const { jsPDF } = window.jspdf;
  const docPDF = new jsPDF();
  docPDF.text("Submission Report", 10, 10);
  let y = 20;
  document.querySelectorAll("#tableBody tr").forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length > 0) {
      docPDF.text(`${cells[0].innerText} | ${cells[2].innerText} | ${cells[3].innerText} | ${cells[4].innerText}`, 10, y);
      y += 8;
    }
  });
  docPDF.save("report.pdf");
}

window.exportExcel = function() {
  const table = document.getElementById("submissionsTable");
  const wb = XLSX.utils.table_to_book(table);
  XLSX.writeFile(wb, "report.xlsx");
}

if (document.getElementById("mySubmissions")) loadMySubmissions();
if (document.getElementById("tableBody")) loadAllSubmissions();