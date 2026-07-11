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

// ===== SIGNUP =====
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

// ===== LOGIN =====
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
      localStorage.setItem("department", userData.department);
      if (userData.role === "admin") window.location.href = "admin.html";
      else if (userData.role === "faculty") window.location.href = "faculty.html";
      else window.location.href = "student.html";
    } else { alert("No role found for this user. Contact admin."); }
  } catch (err) { alert("Login failed: " + err.message); }
}

// ===== LOGOUT =====
window.logout = function() { localStorage.clear(); window.location.href = "index.html"; }

// ===== SUBMIT ACHIEVEMENT (Student/Faculty) =====
window.submitAchievement = async function() {
  const title = document.getElementById("title").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  const date = document.getElementById("date").value;
  const proof = document.getElementById("proof").value;
  if (!title || !description || !date || !proof) { alert("Please fill all fields."); return; }
  await addDoc(collection(db, "submissions"), {
    uid: localStorage.getItem("uid"),
    name: localStorage.getItem("name"),
    role: localStorage.getItem("role"),
    department: localStorage.getItem("department") || "N/A",
    title, category, description, date, proof,
    status: "Pending",
    submittedOn: new Date().toISOString()
  });
  alert("Submitted!");
  document.getElementById("title").value = "";
  document.getElementById("description").value = "";
  document.getElementById("date").value = "";
  document.getElementById("proof").value = "";
  loadMySubmissions();
}

// ===== LOAD MY SUBMISSIONS (Student/Faculty) =====
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

// ===== LOAD ALL SUBMISSIONS (Admin) =====
window.loadAllSubmissions = async function() {
  const filterStatus = document.getElementById("filterStatus")?.value || "All";
  const filterCategory = document.getElementById("filterCategory")?.value || "All";
  const filterRole = document.getElementById("filterRole")?.value || "All";
  const filterDept = document.getElementById("filterDept")?.value || "All";
  const searchName = document.getElementById("searchName")?.value?.toLowerCase() || "";

  const snapshot = await getDocs(collection(db, "submissions"));
  let rows = "";
  let total = 0, pending = 0, approved = 0, rejected = 0;

  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    total++;
    if (d.status === "Pending") pending++;
    if (d.status === "Approved") approved++;
    if (d.status === "Rejected") rejected++;

    if (filterStatus !== "All" && d.status !== filterStatus) return;
    if (filterCategory !== "All" && d.category !== filterCategory) return;
    if (filterRole !== "All" && d.role !== filterRole) return;
    if (filterDept !== "All" && d.department !== filterDept) return;
    if (searchName && !(d.name || "").toLowerCase().includes(searchName)) return;

    rows += `<tr>
      <td>${d.name || "-"}</td><td>${d.role || "-"}</td><td>${d.department || "-"}</td><td>${d.category}</td><td>${d.title}</td><td>${d.status}</td>
      <td>
        <button onclick="updateStatus('${docSnap.id}','Approved')" style="width:auto; display:inline-block; padding:4px 8px; margin:2px;">Approve</button>
        <button onclick="updateStatus('${docSnap.id}','Rejected')" style="width:auto; display:inline-block; padding:4px 8px; margin:2px; background:#e74c3c;">Reject</button>
      </td>
    </tr>`;
  });

  document.getElementById("tableBody").innerHTML = rows || `<tr><td colspan="7">No submissions found.</td></tr>`;
  if (document.getElementById("totalCount")) {
    document.getElementById("totalCount").innerText = total;
    document.getElementById("pendingCount").innerText = pending;
    document.getElementById("approvedCount").innerText = approved;
    document.getElementById("rejectedCount").innerText = rejected;
  }
}

// ===== UPDATE STATUS (Admin Approve/Reject) =====
window.updateStatus = async function(id, status) {
  await updateDoc(doc(db, "submissions", id), { status });
  loadAllSubmissions();
}

// ===== EXPORT PDF =====
window.exportPDF = function() {
  const { jsPDF } = window.jspdf;
  const docPDF = new jsPDF();
  docPDF.text("Submission Report", 10, 10);
  let y = 20;
  document.querySelectorAll("#tableBody tr").forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length > 1) {
      docPDF.text(`${cells[0].innerText} | ${cells[3].innerText} | ${cells[4].innerText} | ${cells[5].innerText}`, 10, y);
      y += 8;
    }
  });
  docPDF.save("report.pdf");
}

// ===== EXPORT EXCEL =====
window.exportExcel = function() {
  const table = document.getElementById("submissionsTable");
  const wb = XLSX.utils.table_to_book(table);
  XLSX.writeFile(wb, "report.xlsx");
}

// ===== ANALYTICS / REPORTS =====
window.loadReports = async function() {
  const snapshot = await getDocs(collection(db, "submissions"));
  const categoryCount = {};
  const deptCount = {};
  const statusCount = { Pending: 0, Approved: 0, Rejected: 0 };
  const roleCount = { student: 0, faculty: 0 };

  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
    const dept = d.department || "Unspecified";
    deptCount[dept] = (deptCount[dept] || 0) + 1;
    if (statusCount[d.status] !== undefined) statusCount[d.status]++;
    if (roleCount[d.role] !== undefined) roleCount[d.role]++;
  });

  new Chart(document.getElementById("categoryChart"), {
    type: 'bar',
    data: {
      labels: Object.keys(categoryCount),
      datasets: [{ label: 'Submissions by Category', data: Object.values(categoryCount), backgroundColor: '#6c63ff' }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  new Chart(document.getElementById("deptChart"), {
    type: 'pie',
    data: {
      labels: Object.keys(deptCount),
      datasets: [{ data: Object.values(deptCount), backgroundColor: ['#6c63ff', '#f39c12', '#2ecc71', '#e74c3c', '#3498db', '#9b59b6'] }]
    },
    options: { responsive: true }
  });

  new Chart(document.getElementById("statusChart"), {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCount),
      datasets: [{ data: Object.values(statusCount), backgroundColor: ['#f39c12', '#2ecc71', '#e74c3c'] }]
    },
    options: { responsive: true }
  });

  new Chart(document.getElementById("roleChart"), {
    type: 'bar',
    data: {
      labels: ['Student', 'Faculty'],
      datasets: [{ label: 'Submissions by Role', data: [roleCount.student, roleCount.faculty], backgroundColor: ['#3498db', '#e67e22'] }]
    },
    options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
  });

  const total = snapshot.size;
  document.getElementById("reportSummary").innerHTML = `
    <p><b>Total Submissions:</b> ${total}</p>
    <p><b>Approved:</b> ${statusCount.Approved} (${total ? Math.round(statusCount.Approved/total*100) : 0}%)</p>
    <p><b>Pending:</b> ${statusCount.Pending} (${total ? Math.round(statusCount.Pending/total*100) : 0}%)</p>
    <p><b>Rejected:</b> ${statusCount.Rejected} (${total ? Math.round(statusCount.Rejected/total*100) : 0}%)</p>
    <p><b>Top Category:</b> ${Object.entries(categoryCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || "N/A"}</p>
    <p><b>Top Department:</b> ${Object.entries(deptCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || "N/A"}</p>
  `;
}

// ===== AUTO-RUN ON PAGE LOAD =====
if (document.getElementById("mySubmissions")) loadMySubmissions();
if (document.getElementById("tableBody")) loadAllSubmissions();