import './App.css';
import 'bootstrap/dist/css/bootstrap.css';
import { Link } from 'react-router-dom';
import KeywordsPage from './pages/keywordsPage';
import CrawlMany from "./pages/CrawlManyDomains";
import KeywordsFromHrefs from './pages/keywordsFromHrefs';
import AllCrawledDomains from './pages/AllCrawledDomain';
export default function Navbar() {

  return (
    <div>
      <nav class="navbar navbar-expand-md navbar-light bg-light" >
        <h2><Link to='/' className='navbar-brand'>WowCategorize</Link></h2>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div className='container-fluid'>
          <ul class="nav nav-tabs" id="myTab" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" id="categorizationtab" data-bs-toggle="tab" data-bs-target="#mainpage" type="button" role="tab" aria-controls="categorizationData" aria-selected="true">Main Page</button>
            </li>
             <li class="nav-item" role="presentation">
              <button class="nav-link" id="mastertableTab" data-bs-toggle="tab" data-bs-target="#mastertable" type="button" role="tab" aria-controls="mastertable" aria-selected="false">All Crawled Domains</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="HTMLtab" data-bs-toggle="tab" data-bs-target="#keywordspage" type="button" role="tab" aria-controls="keywordspage" aria-selected="false">Customize keywords</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="HTMLtab" data-bs-toggle="tab" data-bs-target="#keywordsFromHrefs" type="button" role="tab" aria-controls="keywordsFromHrefs" aria-selected="false">Keywords from Hrefs</button>
            </li>
          </ul>
        </div>
      </nav>

      <div class="tab-content" id="myTabContent">
        <div className="mt-1 tab-pane fade show active" id="mainpage" role="tabpanel" aria-labelledby="mainpage">
          <CrawlMany/>
        </div>
        <div className="tab-pane fade overflow-auto" id="mastertable" role="tabpanel" aria-labelledby="mastertable">
          <AllCrawledDomains/>
        </div>
        <div className="tab-pane fade overflow-auto" id="keywordspage" role="tabpanel" aria-labelledby="keywordspage" >
          <KeywordsPage/>
        </div>
        <div className="tab-pane fade overflow-auto" id="keywordsFromHrefs" role="tabpanel" aria-labelledby="keywordsFromHrefs" >
          <KeywordsFromHrefs/>
        </div>
      </div>
    </div>
  )
}