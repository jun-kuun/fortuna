import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  getAllNews() {
    return this.newsService.getAllNews();
  }

  @Get('market')
  getMarketNews() {
    return this.newsService.getMarketNews();
  }

  @Get('assets')
  getAssetNews(@Query('assetId') assetId?: string) {
    return this.newsService.getAssetNews(assetId);
  }
}
