import Navbar from "./Navbar";
import CrawlOne from "./pages/CrawlSingleDomain";
import KeywordsPage from './pages/keywordsPage';
import CrawlMany from "./pages/CrawlManyDomains";
import {Route, Routes} from 'react-router-dom'
function App() {

  return (
    <div >
    <Navbar/>
    {/* <div>
    <Routes>
<Route path="/" element={<CrawlMany />}/>
<Route path="/keywords" element={<KeywordsPage />} />
<Route path="/crawlSingleUrl" element={<CrawlOne />} />
    </Routes>
    </div> */}
    </div>

  );
}

export default App;
