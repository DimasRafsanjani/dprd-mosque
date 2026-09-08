package com.dprd.mosque.data.api;

import com.dprd.mosque.data.model.Models;
import java.util.List;
import retrofit2.Call;
import retrofit2.http.GET;

public interface ApiService {

    @GET("api/settings")
    Call<Models.PrayerSettings> getSettings();

    @GET("api/announcements")
    Call<List<Models.Announcement>> getAnnouncements();

    @GET("api/friday")
    Call<Models.FridayInfo> getFriday();

    @GET("api/wallpapers")
    Call<List<Models.Wallpaper>> getWallpapers();

    @GET("api/quote")
    Call<Models.Quote> getQuote();
}
