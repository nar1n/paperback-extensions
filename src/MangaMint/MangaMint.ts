import {
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  HomeSection,
  SearchRequest,
  LanguageCode,
  MangaStatus,
  PagedResults,
  SourceInfo
} from "paperback-extensions-common"

const MANGAMINT_API_BASE = "https://mangamint.kaedenoki.net/api"

export const MangaMintInfo: SourceInfo = {
  version: "1.0.0",
  name: "MangaMint",
  icon: "icon.jpg",
  author: "nar1n",
  authorWebsite: "https://github.com/nar1n",
  description: "Extension that pulls manga from mangamint.kaedenoki.net",
  language: "en",
  hentaiSource: false,
  websiteBaseURL: MANGAMINT_API_BASE
}

export class MangaMint extends Source {
  async getMangaDetails(mangaId: string): Promise<Manga> {

    let request = createRequestObject({
      url: `${MANGAMINT_API_BASE}/manga/detail/`,
      method: "GET",
      param: mangaId
    })
    

    let response = await this.requestManager.schedule(request, 1)
    let mangaDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data

    let mangaStatus = MangaStatus.COMPLETED
    if (mangaDetails["status"] == "Ongoing") {
      mangaStatus = MangaStatus.ONGOING
    }

    let manga = createManga({
      id: mangaDetails["manga_endpoint"],
      titles: [mangaDetails["title"]],
      image: mangaDetails["thumb"],
      rating: 5,
      status: mangaStatus,
      author: mangaDetails["author"]
    })

    return manga
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    let request = createRequestObject({
      url: `${MANGAMINT_API_BASE}/manga/detail/`,
      method: "GET",
      param: mangaId
    })

    let response = await this.requestManager.schedule(request, 1)
    let mangaDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data

    let chapters = []
    for (const chapter of mangaDetails["chapter"]) {
      let chapterNumber = chapter["chapter_title"].match(/\d/g)
      chapterNumber = chapterNumber.join("")
      chapters.push(
        createChapter({
          id: chapter["chapter_endpoint"],
          mangaId: mangaId,
          chapNum: Number(chapterNumber),
          langCode: LanguageCode.ENGLISH,
          name: chapter["chapter_title"],
          time: new Date(
            Number(0)
          ),
        })
      )
    }
    return chapters
  }

  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {

    let request = createRequestObject({
      url: `${MANGAMINT_API_BASE}/chapter/`,
      method: "GET",
      param: chapterId
    })

    const response = await this.requestManager.schedule(request, 1)
    let chapterDetails = typeof response.data === "string" ? JSON.parse(response.data) : response.data

    let chapterPages = []
    for (const pageInfo of chapterDetails["chapter_image"]) {
      chapterPages.push(pageInfo["chapter_image_link"])
    }
    
    return createChapterDetails({
      id: chapterId,
      longStrip: false,
      mangaId: mangaId,
      pages: chapterPages,
    })
  }

  async searchRequest(searchQuery: SearchRequest, metadata: any): Promise<PagedResults> {

    let searchTitle = searchQuery.title ?? ''

    let request = createRequestObject({
      url: `${MANGAMINT_API_BASE}/search/`,
      method: "GET",
      param: searchTitle
    })

    const response = await this.requestManager.schedule(request, 1)
    let searchResults = typeof response.data === "string" ? JSON.parse(response.data) : response.data

    let mangas = []
    for (const mangaDetails of searchResults["manga_list"]) {
      mangas.push(
        createMangaTile({
          id: mangaDetails["endpoint"],
          image: mangaDetails["thumb"],
          title: createIconText({ text: mangaDetails["title"] }),
        })
      )
    }

    return createPagedResults({
      results: mangas
    })
  }

  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {

    // Send the empty homesection back so the app can preload the section
    var popularSection = createHomeSection({ id: "popular", title: "POPULAR MANGAS" })
    sectionCallback(popularSection)

    const request = createRequestObject({
      url: `${MANGAMINT_API_BASE}/manga/popular/1`,
      method: "GET"
    })

    const data = await this.requestManager.schedule(request, 1)

    let result = typeof data.data === "string" ? JSON.parse(data.data) : data.data

    let mangas = []
    for (const mangaDetails of result["manga_list"]) {
      mangas.push(
        createMangaTile({
          id: mangaDetails["endpoint"],
          image: mangaDetails["thumb"],
          title: createIconText({ text: mangaDetails["title"] }),
        })
      )
    }
    popularSection.items = mangas

    sectionCallback(popularSection)
  }

  getMangaShareUrl(mangaId: string) {
    return `${MANGAMINT_API_BASE}/manga/detail/${mangaId}`
  }
}
