import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();

// Project card onClick:
onClick={() => navigate(`/board/${projectId}`)}
// export default function Dashboard() {
//   return (
//     <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
//       <h1 className="text-3xl font-bold">Dashboard Coming Soon!</h1>
//     </div>
//   );
// }