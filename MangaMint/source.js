"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaMint = exports.MangaMintInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const MANGAMINT_API_BASE = "https://mangamint.kaedenoki.net/api";
exports.MangaMintInfo = {
    version: "1.0.0",
    name: "MangaMint",
    icon: "icon.jpg",
    author: "nar1n",
    authorWebsite: "https://github.com/nar1n",
    description: "Extension that pulls manga from mangamint.kaedenoki.net",
    language: "en",
    hentaiSource: false,
    websiteBaseURL: MANGAMINT_API_BASE
};
class MangaMint extends paperback_extensions_common_1.Source {
    getMangaDetails(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${MANGAMINT_API_BASE}/manga/detail/`,
                method: "GET",
                param: mangaId
            });
            let response = yield this.requestManager.schedule(request, 1);
            let mangaDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            let mangaStatus = paperback_extensions_common_1.MangaStatus.COMPLETED;
            if (mangaDetails["status"] == "Ongoing") {
                mangaStatus = paperback_extensions_common_1.MangaStatus.ONGOING;
            }
            let manga = createManga({
                id: mangaDetails["manga_endpoint"],
                titles: [mangaDetails["title"]],
                image: mangaDetails["thumb"],
                rating: 5,
                status: mangaStatus,
                author: mangaDetails["author"]
            });
            return manga;
        });
    }
    getChapters(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${MANGAMINT_API_BASE}/manga/detail/`,
                method: "GET",
                param: mangaId
            });
            let response = yield this.requestManager.schedule(request, 1);
            let mangaDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            let chapters = [];
            for (const chapter of mangaDetails["chapter"]) {
                let chapterNumber = chapter["chapter_title"].match(/\d/g);
                chapterNumber = chapterNumber.join("");
                chapters.push(createChapter({
                    id: chapter["chapter_endpoint"],
                    mangaId: mangaId,
                    chapNum: Number(chapterNumber),
                    langCode: paperback_extensions_common_1.LanguageCode.ENGLISH,
                    name: chapter["chapter_title"],
                    time: new Date(Number(0)),
                }));
            }
            return chapters;
        });
    }
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = createRequestObject({
                url: `${MANGAMINT_API_BASE}/chapter/`,
                method: "GET",
                param: chapterId
            });
            const response = yield this.requestManager.schedule(request, 1);
            let chapterDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            let chapterPages = [];
            for (const pageInfo of chapterDetails["chapter_image"]) {
                chapterPages.push(pageInfo["chapter_image_link"]);
            }
            return createChapterDetails({
                id: chapterId,
                longStrip: false,
                mangaId: mangaId,
                pages: chapterPages,
            });
        });
    }
    searchRequest(searchQuery, metadata) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let searchTitle = (_a = searchQuery.title) !== null && _a !== void 0 ? _a : '';
            let request = createRequestObject({
                url: `${MANGAMINT_API_BASE}/search/`,
                method: "GET",
                param: searchTitle
            });
            const response = yield this.requestManager.schedule(request, 1);
            let searchResults = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            let mangas = [];
            for (const mangaDetails of searchResults["manga_list"]) {
                mangas.push(createMangaTile({
                    id: mangaDetails["endpoint"],
                    image: mangaDetails["thumb"],
                    title: createIconText({ text: mangaDetails["title"] }),
                }));
            }
            return createPagedResults({
                results: mangas
            });
        });
    }
    getHomePageSections(sectionCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            // Send the empty homesection back so the app can preload the section
            var popularSection = createHomeSection({ id: "popular", title: "POPULAR MANGAS" });
            sectionCallback(popularSection);
            const request = createRequestObject({
                url: `${MANGAMINT_API_BASE}/manga/popular/1`,
                method: "GET"
            });
            const data = yield this.requestManager.schedule(request, 1);
            let result = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
            let mangas = [];
            for (const mangaDetails of result["manga_list"]) {
                mangas.push(createMangaTile({
                    id: mangaDetails["endpoint"],
                    image: mangaDetails["thumb"],
                    title: createIconText({ text: mangaDetails["title"] }),
                }));
            }
            popularSection.items = mangas;
            sectionCallback(popularSection);
        });
    }
    getMangaShareUrl(mangaId) {
        return `${MANGAMINT_API_BASE}/manga/detail/${mangaId}`;
    }
}
exports.MangaMint = MangaMint;
