package com.dprd.mosque;

import android.app.Application;
import com.dprd.mosque.data.PreferencesManager;

public class App extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        PreferencesManager.init(this);
    }
}
