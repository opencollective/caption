// Packages
import { platform } from "os";
import { ipcRenderer } from "electron";
import withRedux from "next-redux-wrapper";
import React, { Component } from "react";
import PropTypes from "prop-types";

// Components
import Layout from "../components/Layout";
import TitleBar from "../components/TitleBar";

// Containers
import Search from "../containers/Search";
import Content from "../containers/Content";
import Footer from "../containers/Footer";

// Redux store
import initStore from "./../store";

// Redux action creators
import {
  setLanguage,
  showNotification,
  resetSearch,
  showSearchPlaceholder,
  hideSearchPlaceholder,
  updateSearchQuery,
  startSearch,
  searchByQuery,
  downloadComplete,
  showSearchSpinner,
  searchByFiles,
  dropFiles,
  updateSearchResults,
  logDonatedButtonClicked,
  logAboutWindowOpend,
  updateFileSearchStatus,
} from "./../actions";

// Analytics
import { initGA, logPageView } from "./../utils/tracking";

// Global variables
const ESC_KEY = 27;

class MainApp extends Component {
  constructor(props) {
    super(props);

    this.isWindows = platform() === "win32";
    this.onLanguageChange = this.onLanguageChange.bind(this);
    this.checkIfOnline = this.checkIfOnline.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onSearch = this.onSearch.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  // handling escape close
  componentDidMount() {
    initGA();
    logPageView();
    this.checkIfOnline();

    ipcRenderer.on("results", (event, { results, isFinished }) => {
      this.props.updateSearchResults({
        results,
        searchCompleted: isFinished,
      });
    });

    ipcRenderer.on("language", (event, language) => {
      this.props.setLanguage(language);
    });

    ipcRenderer.on("allFilesDownloaded", () => {
      this.props.downloadComplete();
    });

    ipcRenderer.on("openFile", async (event, file) => {
      const rawFiles = [file];
      this.props.dropFiles(rawFiles);
    });

    ipcRenderer.on("processedFiles", (event, files) => {
      this.props.dropFiles(files);
    });

    ipcRenderer.on("logDonated", () => {
      this.props.logDonatedButtonClicked();
    });

    ipcRenderer.on("logAbout", () => {
      this.props.logAboutWindowOpend();
    });

    ipcRenderer.on("updateFileSearchStatus", (event, { filePath, status }) => {
      this.props.updateFileSearchStatus(filePath, status);
    });

    ipcRenderer.send("getStore", "language");
    document.addEventListener("keydown", this.onKeyDown);

    // Prevent drop on document
    document.addEventListener(
      "dragover",
      event => {
        event.preventDefault();
        return false;
      },
      false,
    );

    document.addEventListener(
      "drop",
      event => {
        event.preventDefault();
        return false;
      },
      false,
    );
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("online", this.checkIfOnline);
  }

  onKeyDown(event) {
    if (event.keyCode >= 48 && event.keyCode <= 90) {
      this.onFocus();
    }

    if (event.keyCode === ESC_KEY) {
      this.props.resetSearch();
      this.onBlur();
    }
  }

  onFocus() {
    this.props.hideSearchPlaceholder();
    this.search.getWrappedInstance().searchField.textInput.focus();
  }

  onBlur() {
    this.props.showSearchPlaceholder();
    this.search.getWrappedInstance().searchField.textInput.blur();
  }

  onLanguageChange(event) {
    const language = event.target.value;

    this.props.setLanguage(language);
  }

  onSearch(event) {
    if (event) {
      event.preventDefault();
    }

    this.props.startSearch();
  }

  checkIfOnline() {
    ipcRenderer.send("online", navigator.onLine);
    window.addEventListener("offline", () => {
      ipcRenderer.send("online", navigator.onLine);
    });
  }

  render() {
    return (
      <Layout>
        {!this.isWindows && <TitleBar title="Caption" />}
        <Search
          onSubmit={this.onSearch}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          ref={search => {
            this.search = search;
          }}
        />
        <Content />
        <Footer />
      </Layout>
    );
  }
}

MainApp.propTypes = {
  downloadComplete: PropTypes.func.isRequired,
  updateSearchResults: PropTypes.func.isRequired,
  setLanguage: PropTypes.func.isRequired,
  resetSearch: PropTypes.func.isRequired,
  hideSearchPlaceholder: PropTypes.func.isRequired,
  showSearchPlaceholder: PropTypes.func.isRequired,
  startSearch: PropTypes.func.isRequired,
  showNotification: PropTypes.func.isRequired,
  dropFiles: PropTypes.func.isRequired,
  logDonatedButtonClicked: PropTypes.func.isRequired,
  logAboutWindowOpend: PropTypes.func.isRequired,
  updateFileSearchStatus: PropTypes.func.isRequired,
};

const mapStateToProps = ({ ui, search }) => ({
  language: ui.language,
  searchQuery: search.searchQuery,
  files: search.files,
  placeholder: search.placeholder,
  results: search.results,
  loading: search.loading,
  searchCompleted: search.searchCompleted,
});

const mapDispatchToProps = {
  setLanguage,
  showNotification,
  resetSearch,
  showSearchPlaceholder,
  hideSearchPlaceholder,
  startSearch,
  searchByQuery,
  updateSearchQuery,
  downloadComplete,
  showSearchSpinner,
  searchByFiles,
  dropFiles,
  updateSearchResults,
  logDonatedButtonClicked,
  logAboutWindowOpend,
  updateFileSearchStatus,
};

export default withRedux(initStore, mapStateToProps, mapDispatchToProps)(MainApp);
