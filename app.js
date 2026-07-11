import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword }
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

window.submitAchievement = async function() {
  const title = document.getElementById("title").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  const date = document.getElementById("date").value;
  const proof = document.getElementById("proof").value;

  await addDoc(collection(db, "submissions"), {
    uid: localStorage.getItem("uid"),
    name: localStorage.getItem("name"),
    role: localStorage.getItem("role"),
    title, category, description, date, proof,
    status: "Pending",
    submittedOn: new Date().toISOString()
  });
  alert("Submitted!");
  loadMySubmissions();
}

window.loadMySubmissions = async function() {
  const q = query(collection(db, "submissions"), where("uid", "==", localStorage.getItem("uid")));
  const snapshot = await getDocs(q);
  let html = "";
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    html += `<p><b>${d.title}</b> (${d.category}) - Status: <b>${d.status}</b></p>`;
  });
  document.getElementById("mySubmissions").innerHTML = html;
}

// Only auto-run loadMySubmissions if we're actually on a page that has the mySubmissions element
document.getElementById("mySubmissions") && loadMySubmissions();

// ===== LOGIN (Person A) =====
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
    } else {
      alert("No role found for this user.");
    }
  } catch (err) {
    alert("Login failed: " + err.message);
  }
}

// ===== ADMIN PANEL (Person A) =====
window.loadAllSubmissions = async function() {
  const filter = document.getElementById("filterStatus")?.value || "All";
  const snapshot = await getDocs(collection(db, "submissions"));
  let rows = "";
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    if (filter !== "All" && d.status !== filter) return;
    rows += `<tr>
      <td>${d.name}</td><td>${d.role}</td><td>${d.category}</td><td>${d.title}</td><td>${d.status}</td>
      <td>
        <button onclick="updateStatus('${docSnap.id}','Approved')">Approve</button>
        <button onclick="updateStatus('${docSnap.id}','Rejected')">Reject</button>
      </td>
    </tr>`;
  });
  document.getElementById("tableBody").innerHTML = rows;
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
    docPDF.text(`${cells[0].innerText} | ${cells[2].innerText} | ${cells[3].innerText} | ${cells[4].innerText}`, 10, y);
    y += 8;
  });
  docPDF.save("report.pdf");
}

window.exportExcel = function() {
  const table = document.getElementById("submissionsTable");
  const wb = XLSX.utils.table_to_book(table);
  XLSX.writeFile(wb, "report.xlsx");
}

// Only auto-run loadAllSubmissions if we're on the admin page
document.getElementById("tableBody") && loadAllSubmissions();