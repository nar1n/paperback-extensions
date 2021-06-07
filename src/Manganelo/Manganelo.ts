import {
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  HomeSection,
  SearchRequest,
  TagSection,
  PagedResults,
  SourceInfo,
  MangaUpdates,
  RequestHeaders,
  TagType,
  ContentRating,
  Section
} from "paperback-extensions-common"
import { generateSearch, isLastPage, parseChapterDetails, parseChapters, parseHomeSections, parseMangaDetails, parseSearch, parseTags, parseUpdatedManga, parseViewMore, UpdatedManga } from "./ManganeloParser"

const MN_DOMAIN = 'https://manganelo.com'
const method = 'GET'
const headers = {
  "content-type": "application/x-www-form-urlencoded"
}

export const ManganeloInfo: SourceInfo = {
  version: '3.0.0',
  name: 'Manganelo',
  icon: 'icon.png',
  author: 'Daniel Kovalevich',
  authorWebsite: 'https://github.com/DanielKovalevich',
  description: 'Extension that pulls manga from Manganelo, includes Advanced Search and Updated manga fetching',
  contentRating: ContentRating.MATURE,
  websiteBaseURL: MN_DOMAIN,
  sourceTags: [
    {
      text: "Notifications",
      type: TagType.GREEN
    }
  ]
}

export class Manganelo extends Source {

  requestManager = createRequestManager({
    requestsPerSecond: 2
  })

  stateManager = createSourceStateManager({})

  getMangaShareUrl(mangaId: string): string { return `${MN_DOMAIN}/manga/${mangaId}` }

  getSourceMenu(): Promise<Section> {
    return Promise.resolve(createSection({
      id: 'main',
      header: 'Source Settings',
      footer: '',
      rows: () => {
        return Promise.resolve([
          createNavigationButton({
            id: 'image_server',
            value: '',
            label: 'Image Server',
            //@ts-ignore
            form: createForm({
              //@ts-ignore
              onSubmit: (values: any) => {
                console.log(JSON.stringify(values))
              },
              sections: () => {
                return Promise.resolve([
                  createSection({
                    id: 'image_server_section',
                    rows: () => {
                      return Promise.resolve([
                        createSelect({
                          id: 'image_server',
                          label: 'Image Server',
                          //@ts-ignore
                          options: ['server1', 'server2'],
                          //@ts-ignore
                          displayLabel: (option) => {
                            switch (option) {
                              case 'server1':
                                return 'Server 1'
                              case 'server2':
                                return 'Server 2'
                            }
                          },
                          //@ts-ignore
                          value: ['server1', 'server2']
                        })
                      ])
                    }
                  })
                ])
              }
            })
          })
        ])
      }
    }))
  }

  async getMangaDetails(mangaId: string): Promise<Manga> {
    const request = createRequestObject({
      url: `${MN_DOMAIN}/manga/`,
      method,
      param: mangaId
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    return parseMangaDetails($, mangaId)
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const request = createRequestObject({
      url: `${MN_DOMAIN}/manga/`,
      method,
      param: mangaId
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    return parseChapters($, mangaId)
  }

  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
    const request = createRequestObject({
      url: `${MN_DOMAIN}/chapter/`,
      method,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Cookie: 'content_lazyload=off'
      },
      param: `${mangaId}/${chapterId}`
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    return parseChapterDetails($, mangaId, chapterId)
  }

  async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
    let page = 1
    let updatedManga: UpdatedManga = {
      ids: [],
      loadMore: true
    }

    while (updatedManga.loadMore) {
      const request = createRequestObject({
        url: `${MN_DOMAIN}/genre-all/`,
        method,
        headers,
        param: String(page++)
      })

      const response = await this.requestManager.schedule(request, 1)
      const $ = this.cheerio.load(response.data)
      updatedManga = parseUpdatedManga($, time, ids)

      if (updatedManga.ids.length > 0) {
        mangaUpdatesFoundCallback(createMangaUpdates({
          ids: updatedManga.ids
        }))
      }
    }
  }

  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
    // Give Paperback a skeleton of what these home sections should look like to pre-render them
    const section1 = createHomeSection({ id: 'top_week', title: 'TOP OF THE WEEK' })
    const section2 = createHomeSection({ id: 'latest_updates', title: 'LATEST UPDATES', view_more: true })
    const section3 = createHomeSection({ id: 'new_manga', title: 'NEW MANGA', view_more: true })
    const sections = [section1, section2, section3]

    // Fill the homsections with data
    const request = createRequestObject({
      url: MN_DOMAIN,
      method,
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    parseHomeSections($, sections, sectionCallback)
  }

  async searchRequest(query: SearchRequest, metadata: any): Promise<PagedResults> {
    let page : number = metadata?.page ?? 1
    const search = generateSearch(query)
    const request = createRequestObject({
      url: `${MN_DOMAIN}/advanced_search?`,
      method,
      headers,
      param: `${search}${'&page=' + page}`
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    const manga = parseSearch($)
    metadata = !isLastPage($) ? {page: page + 1} : undefined
    
    return createPagedResults({
      results: manga,
      metadata
    })
  }

  async getTags(): Promise<TagSection[]> {
    const request = createRequestObject({
      url: `${MN_DOMAIN}/advanced_search?`,
      method,
      headers,
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    const tags = parseTags($)
    return tags ? tags : []
  }

  async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
    let page : number = metadata?.page ?? 1
    let param = ''
    if (homepageSectionId === 'latest_updates')
      param = `/genre-all/${page}`
    else if (homepageSectionId === 'new_manga')
      param = `/genre-all/${page}?type=newest`
    else throw new Error(`Requested to getViewMoreItems for a section ID which doesn't exist`)

    const request = createRequestObject({
      url: `${MN_DOMAIN}`,
      method,
      param,
    })

    const response = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(response.data)
    const manga = parseViewMore($)
    metadata = !isLastPage($) ? { page: page + 1 } : undefined

    return createPagedResults({
      results: manga,
      metadata
    })
  }

  globalRequestHeaders(): RequestHeaders {
    return {
      referer: MN_DOMAIN
    }
  }
}